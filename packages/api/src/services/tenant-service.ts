import { Effect } from "effect";
import type { TenantRepo } from "../repos/tenant-repo.js";
import type { TenantConfig } from "../db/schema/index.js";
import type { DbError, NotFoundError } from "../core/effect/app-error.js";

const DEFAULT_MUTUAL_RATE = 0.93;

export interface TenantConfigResolved {
  mutualRate: number;
  emissoTeamId?: string;
}

export function createTenantService(tenantRepo: TenantRepo) {
  return {
    getConfig(
      tenantId: string,
    ): Effect.Effect<TenantConfigResolved, DbError | NotFoundError> {
      return tenantRepo.getById(tenantId).pipe(
        Effect.map((tenant) => {
          const config: TenantConfig = tenant.config ?? {};
          return {
            mutualRate: config.mutualRate ?? DEFAULT_MUTUAL_RATE,
            emissoTeamId: config.emissoTeamId,
          };
        }),
      );
    },
  };
}

export type TenantService = ReturnType<typeof createTenantService>;
