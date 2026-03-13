import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { Effect } from "effect";
import type { PGlite } from "@electric-sql/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { setupTestDb, truncateAll } from "../helpers/setup-db";
import { seedReferenceData } from "../helpers/seed";
import { createReferenceRepo } from "../../src/repos/reference-repo";
import { createReferenceService } from "../../src/services/reference-service";

let pglite: PGlite;
let db: PgliteDatabase;
let service: ReturnType<typeof createReferenceService>;

beforeAll(async () => {
  const result = await setupTestDb();
  pglite = result.pglite;
  db = result.db;
  const repo = createReferenceRepo(db as any);
  service = createReferenceService(repo);
});

afterEach(async () => {
  await truncateAll(pglite);
});

afterAll(async () => {
  await pglite.close();
});

describe("reference-service", () => {
  describe("buildReferenceData", () => {
    it("builds complete ReferenceData from DB", async () => {
      await seedReferenceData(pglite);

      const refData = await Effect.runPromise(
        service.buildReferenceData(),
      );

      // Indicators
      expect(refData.uf).toBe(38500);
      expect(refData.utm).toBe(66000);
      expect(refData.uta).toBe(792000);
      expect(refData.imm).toBe(500000);

      // Hardcoded values
      expect(refData.fonasaRate).toBe(7);
      expect(refData.unemploymentRate).toBe(0.6);

      // AFP rates
      expect(refData.afpRates.capital).toBeDefined();
      expect(refData.afpRates.capital!.commissionRate).toBe(1.44);

      // Tax brackets
      expect(refData.taxBrackets.length).toBeGreaterThanOrEqual(3);
      // marginalRate converted: 0.0400 → 4
      expect(refData.taxBrackets[1]!.rate).toBe(4);

      // Family allowance
      expect(refData.familyAllowanceBrackets.length).toBeGreaterThanOrEqual(2);
    });

    it("uses custom mutualRate", async () => {
      await seedReferenceData(pglite);

      const refData = await Effect.runPromise(
        service.buildReferenceData(undefined, 1.5),
      );

      expect(refData.mutualRate).toBe(1.5);
    });

    it("fails with NotFoundError when no indicators exist", async () => {
      const result = await Effect.runPromiseExit(
        service.buildReferenceData(),
      );
      expect(result._tag).toBe("Failure");
    });
  });
});
