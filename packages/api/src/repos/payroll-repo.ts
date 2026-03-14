import { Effect } from "effect";
import { and, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  payrollRuns,
  payrollResults,
  earnings,
  deductions,
  type PayrollRun,
  type NewPayrollRun,
  type PayrollResult,
  type NewPayrollResult,
  type Earning,
  type Deduction,
} from "../db/schema/index.js";
import { DbError, ConflictError, NotFoundError, ValidationError } from "../core/effect/app-error.js";
import { queryOneOrFail } from "../core/effect/repo-helpers.js";

export function createPayrollRepo(db: PgDatabase<any>) {
  return {
    createRun(
      tenantId: string,
      data: Omit<NewPayrollRun, "id" | "tenantId" | "createdAt" | "updatedAt">,
    ): Effect.Effect<PayrollRun, DbError | ConflictError> {
      return Effect.tryPromise({
        try: () =>
          db
            .insert(payrollRuns)
            .values({ ...data, tenantId })
            .returning()
            .then((rows) => rows[0]!),
        catch: (e) => {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("unique") || msg.includes("duplicate")) {
            return ConflictError.make(
              `Payroll run already exists for ${data.periodYear}-${data.periodMonth}`,
              "PayrollRun",
              `${data.periodYear}-${data.periodMonth}`,
            );
          }
          return DbError.make("payrollRun.create", e);
        },
      });
    },

    getRunById(
      tenantId: string,
      runId: string,
    ) {
      return queryOneOrFail("payrollRun.getById", "PayrollRun", runId, () =>
        db
          .select()
          .from(payrollRuns)
          .where(
            and(
              eq(payrollRuns.id, runId),
              eq(payrollRuns.tenantId, tenantId),
            ),
          )
          .then((rows) => rows[0]),
      );
    },

    listRuns(
      tenantId: string,
      filters?: { year?: number; status?: string },
    ): Effect.Effect<PayrollRun[], DbError> {
      return Effect.tryPromise({
        try: () => {
          const conditions = [eq(payrollRuns.tenantId, tenantId)];
          if (filters?.year !== undefined) {
            conditions.push(eq(payrollRuns.periodYear, filters.year));
          }
          if (filters?.status) {
            conditions.push(
              eq(payrollRuns.status, filters.status as PayrollRun["status"]),
            );
          }
          return db
            .select()
            .from(payrollRuns)
            .where(and(...conditions));
        },
        catch: (e) => DbError.make("payrollRun.list", e),
      });
    },

    /**
     * Atomically transition a run from `fromStatus` to `toStatus`.
     * Returns the updated run, or fails with ValidationError if the
     * current status doesn't match (TOCTOU-safe).
     */
    claimRun(
      tenantId: string,
      runId: string,
      fromStatus: PayrollRun["status"],
      toStatus: PayrollRun["status"],
      extraData?: Partial<Omit<NewPayrollRun, "id" | "tenantId" | "createdAt">>,
    ): Effect.Effect<PayrollRun, DbError | NotFoundError | ValidationError> {
      return Effect.tryPromise({
        try: () =>
          db
            .update(payrollRuns)
            .set({ ...extraData, status: toStatus, updatedAt: new Date() })
            .where(
              and(
                eq(payrollRuns.id, runId),
                eq(payrollRuns.tenantId, tenantId),
                eq(payrollRuns.status, fromStatus),
              ),
            )
            .returning()
            .then((rows) => rows[0]),
        catch: (e) => DbError.make("payrollRun.claimRun", e),
      }).pipe(
        Effect.flatMap((row) => {
          if (!row) {
            // Row not updated — either doesn't exist or wrong status
            return queryOneOrFail("payrollRun.claimRun", "PayrollRun", runId, () =>
              db
                .select()
                .from(payrollRuns)
                .where(
                  and(
                    eq(payrollRuns.id, runId),
                    eq(payrollRuns.tenantId, tenantId),
                  ),
                )
                .then((rows) => rows[0]),
            ).pipe(
              Effect.flatMap((existing) =>
                Effect.fail(
                  ValidationError.make(
                    `Cannot transition run from '${existing.status}' to '${toStatus}', must be '${fromStatus}'`,
                    "status",
                  ),
                ),
              ),
            );
          }
          return Effect.succeed(row);
        }),
      );
    },

    updateRun(
      tenantId: string,
      runId: string,
      data: Partial<
        Omit<NewPayrollRun, "id" | "tenantId" | "createdAt">
      >,
    ): Effect.Effect<PayrollRun, DbError | NotFoundError> {
      return Effect.tryPromise({
        try: () =>
          db
            .update(payrollRuns)
            .set({ ...data, updatedAt: new Date() })
            .where(
              and(
                eq(payrollRuns.id, runId),
                eq(payrollRuns.tenantId, tenantId),
              ),
            )
            .returning()
            .then((rows) => rows[0]),
        catch: (e) => DbError.make("payrollRun.update", e),
      }).pipe(
        Effect.flatMap((row) =>
          row
            ? Effect.succeed(row)
            : Effect.fail(NotFoundError.make("PayrollRun", runId)),
        ),
      );
    },

    upsertResults(
      tenantId: string,
      runId: string,
      results: Omit<NewPayrollResult, "id" | "tenantId" | "payrollRunId" | "createdAt">[],
    ): Effect.Effect<void, DbError> {
      return Effect.tryPromise({
        try: () =>
          db.transaction(async (tx) => {
            await tx
              .delete(payrollResults)
              .where(
                and(
                  eq(payrollResults.payrollRunId, runId),
                  eq(payrollResults.tenantId, tenantId),
                ),
              );
            if (results.length > 0) {
              await tx.insert(payrollResults).values(
                results.map((r) => ({
                  ...r,
                  tenantId,
                  payrollRunId: runId,
                })),
              );
            }
          }),
        catch: (e) => DbError.make("payrollResult.upsert", e),
      });
    },

    getResultsByRunId(
      tenantId: string,
      runId: string,
    ): Effect.Effect<PayrollResult[], DbError> {
      return Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(payrollResults)
            .where(
              and(
                eq(payrollResults.payrollRunId, runId),
                eq(payrollResults.tenantId, tenantId),
              ),
            ),
        catch: (e) => DbError.make("payrollResult.getByRunId", e),
      });
    },

    getEarningsByRun(
      tenantId: string,
      runId: string,
    ): Effect.Effect<Earning[], DbError> {
      return Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(earnings)
            .where(
              and(
                eq(earnings.payrollRunId, runId),
                eq(earnings.tenantId, tenantId),
              ),
            ),
        catch: (e) => DbError.make("earning.getByRun", e),
      });
    },

    getDeductionsByRun(
      tenantId: string,
      runId: string,
    ): Effect.Effect<Deduction[], DbError> {
      return Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(deductions)
            .where(
              and(
                eq(deductions.payrollRunId, runId),
                eq(deductions.tenantId, tenantId),
              ),
            ),
        catch: (e) => DbError.make("deduction.getByRun", e),
      });
    },
  };
}

export type PayrollRepo = ReturnType<typeof createPayrollRepo>;
