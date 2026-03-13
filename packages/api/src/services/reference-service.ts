import { Effect } from "effect";
import type { ReferenceData } from "@emisso/payroll";
import type { ReferenceRepo } from "../repos/reference-repo.js";
import { buildReferenceData } from "../core/bridge.js";
import type { AppError } from "../core/effect/app-error.js";

export function createReferenceService(referenceRepo: ReferenceRepo) {
  return {
    /**
     * Builds a complete ReferenceData object from the DB.
     * Fetches all 4 reference tables and runs bridge conversion.
     */
    buildReferenceData(
      date?: string,
      mutualRate: number = 0.93,
    ): Effect.Effect<ReferenceData, AppError> {
      return Effect.gen(function* () {
        const [indicators, afpRates, taxBrackets, familyAllowance] =
          yield* Effect.all(
            [
              referenceRepo.getIndicators(date),
              referenceRepo.getAfpRates(date),
              referenceRepo.getTaxBrackets(date),
              referenceRepo.getFamilyAllowance(date),
            ],
            { concurrency: 4 },
          );

        return buildReferenceData(
          indicators,
          afpRates,
          taxBrackets,
          familyAllowance,
          mutualRate,
        );
      });
    },
  };
}

export type ReferenceService = ReturnType<typeof createReferenceService>;
