import { Effect } from "effect";
import { and, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  previredFiles,
  type PreviredFile,
} from "../db/schema/index.js";
import { DbError, NotFoundError } from "../core/effect/app-error.js";

export function createPreviredRepo(db: PgDatabase<any>) {
  return {
    save(
      tenantId: string,
      runId: string,
      content: string,
    ): Effect.Effect<PreviredFile, DbError> {
      return Effect.tryPromise({
        try: () =>
          db
            .insert(previredFiles)
            .values({
              tenantId,
              payrollRunId: runId,
              fileContent: content,
            })
            .returning()
            .then((rows) => rows[0]!),
        catch: (e) => DbError.make("previred.save", e),
      });
    },

    getById(
      tenantId: string,
      fileId: string,
    ): Effect.Effect<PreviredFile, DbError | NotFoundError> {
      return Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(previredFiles)
            .where(
              and(
                eq(previredFiles.id, fileId),
                eq(previredFiles.tenantId, tenantId),
              ),
            )
            .then((rows) => rows[0]),
        catch: (e) => DbError.make("previred.getById", e),
      }).pipe(
        Effect.flatMap((row) =>
          row
            ? Effect.succeed(row)
            : Effect.fail(NotFoundError.make("PreviredFile", fileId)),
        ),
      );
    },
  };
}

export type PreviredRepo = ReturnType<typeof createPreviredRepo>;
