import { Effect } from "effect";
import { eq, lte, desc } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  referenceIndicators,
  referenceAfpRates,
  referenceTaxBrackets,
  referenceFamilyAllowance,
  type ReferenceIndicator,
  type ReferenceAfpRate,
  type ReferenceTaxBracket,
  type ReferenceFamilyAllowance,
  type NewReferenceIndicator,
} from "../db/schema/index.js";
import { DbError, NotFoundError } from "../core/effect/app-error.js";

export function createReferenceRepo(db: PgDatabase<any>) {
  return {
    /**
     * Get indicators for a date (temporal: effectiveDate <= date, newest first).
     * If no date provided, gets the most recent indicators.
     */
    getIndicators(
      date?: string,
    ): Effect.Effect<ReferenceIndicator, DbError | NotFoundError> {
      return Effect.tryPromise({
        try: () => {
          const query = db
            .select()
            .from(referenceIndicators)
            .orderBy(desc(referenceIndicators.effectiveDate))
            .limit(1);

          if (date) {
            return query
              .where(lte(referenceIndicators.effectiveDate, date))
              .then((rows) => rows[0]);
          }
          return query.then((rows) => rows[0]);
        },
        catch: (e) => DbError.make("reference.getIndicators", e),
      }).pipe(
        Effect.flatMap((row) =>
          row
            ? Effect.succeed(row)
            : Effect.fail(
                NotFoundError.make(
                  "ReferenceIndicator",
                  undefined,
                ),
              ),
        ),
      );
    },

    getAfpRates(
      date?: string,
    ): Effect.Effect<ReferenceAfpRate[], DbError> {
      return Effect.tryPromise({
        try: () => {
          // Get the most recent effective date <= target date
          if (date) {
            return db
              .select()
              .from(referenceAfpRates)
              .where(lte(referenceAfpRates.effectiveDate, date))
              .orderBy(desc(referenceAfpRates.effectiveDate));
          }
          return db
            .select()
            .from(referenceAfpRates)
            .orderBy(desc(referenceAfpRates.effectiveDate));
        },
        catch: (e) => DbError.make("reference.getAfpRates", e),
      }).pipe(
        // Filter to only the most recent effectiveDate
        Effect.map((rows) => {
          if (rows.length === 0) return [];
          const latestDate = rows[0]!.effectiveDate;
          return rows.filter((r) => r.effectiveDate === latestDate);
        }),
      );
    },

    getTaxBrackets(
      date?: string,
    ): Effect.Effect<ReferenceTaxBracket[], DbError> {
      return Effect.tryPromise({
        try: () => {
          if (date) {
            return db
              .select()
              .from(referenceTaxBrackets)
              .where(lte(referenceTaxBrackets.effectiveDate, date))
              .orderBy(desc(referenceTaxBrackets.effectiveDate));
          }
          return db
            .select()
            .from(referenceTaxBrackets)
            .orderBy(desc(referenceTaxBrackets.effectiveDate));
        },
        catch: (e) => DbError.make("reference.getTaxBrackets", e),
      }).pipe(
        Effect.map((rows) => {
          if (rows.length === 0) return [];
          const latestDate = rows[0]!.effectiveDate;
          return rows.filter((r) => r.effectiveDate === latestDate);
        }),
      );
    },

    getFamilyAllowance(
      date?: string,
    ): Effect.Effect<ReferenceFamilyAllowance[], DbError> {
      return Effect.tryPromise({
        try: () => {
          if (date) {
            return db
              .select()
              .from(referenceFamilyAllowance)
              .where(lte(referenceFamilyAllowance.effectiveDate, date))
              .orderBy(desc(referenceFamilyAllowance.effectiveDate));
          }
          return db
            .select()
            .from(referenceFamilyAllowance)
            .orderBy(desc(referenceFamilyAllowance.effectiveDate));
        },
        catch: (e) => DbError.make("reference.getFamilyAllowance", e),
      }).pipe(
        Effect.map((rows) => {
          if (rows.length === 0) return [];
          const latestDate = rows[0]!.effectiveDate;
          return rows.filter((r) => r.effectiveDate === latestDate);
        }),
      );
    },

    upsertIndicators(
      data: Omit<NewReferenceIndicator, "id" | "createdAt" | "updatedAt">,
    ): Effect.Effect<ReferenceIndicator, DbError> {
      return Effect.tryPromise({
        try: () =>
          db
            .insert(referenceIndicators)
            .values(data)
            .onConflictDoUpdate({
              target: referenceIndicators.effectiveDate,
              set: {
                uf: data.uf,
                utm: data.utm,
                uta: data.uta,
                imm: data.imm,
                updatedAt: new Date(),
              },
            })
            .returning()
            .then((rows) => rows[0]!),
        catch: (e) => DbError.make("reference.upsertIndicators", e),
      });
    },
  };
}

export type ReferenceRepo = ReturnType<typeof createReferenceRepo>;
