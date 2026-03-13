import { Effect } from "effect";
import { and, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  previredFiles,
  type PreviredFile,
} from "../db/schema/index.js";
import { DbError } from "../core/effect/app-error.js";
import { queryOneOrFail } from "../core/effect/repo-helpers.js";

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
    ) {
      return queryOneOrFail("previred.getById", "PreviredFile", fileId, () =>
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
      );
    },
  };
}

export type PreviredRepo = ReturnType<typeof createPreviredRepo>;
