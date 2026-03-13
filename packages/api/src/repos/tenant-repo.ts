import { Effect } from "effect";
import { eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { tenants, type Tenant } from "../db/schema/index.js";
import { DbError, NotFoundError } from "../core/effect/app-error.js";

export function createTenantRepo(db: PgDatabase<any>) {
  return {
    getById(tenantId: string): Effect.Effect<Tenant, DbError | NotFoundError> {
      return Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(tenants)
            .where(eq(tenants.id, tenantId))
            .then((rows) => rows[0]),
        catch: (e) => DbError.make("tenant.getById", e),
      }).pipe(
        Effect.flatMap((row) =>
          row
            ? Effect.succeed(row)
            : Effect.fail(NotFoundError.make("Tenant", tenantId)),
        ),
      );
    },
  };
}

export type TenantRepo = ReturnType<typeof createTenantRepo>;
