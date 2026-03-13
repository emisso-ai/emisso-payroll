import { eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { tenants, type Tenant } from "../db/schema/index.js";
import { queryOneOrFail } from "../core/effect/repo-helpers.js";

export function createTenantRepo(db: PgDatabase<any>) {
  return {
    getById(tenantId: string) {
      return queryOneOrFail("tenant.getById", "Tenant", tenantId, () =>
        db
          .select()
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .then((rows) => rows[0]),
      );
    },
  };
}

export type TenantRepo = ReturnType<typeof createTenantRepo>;
