import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { Effect } from "effect";
import type { PGlite } from "@electric-sql/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { setupTestDb, truncateAll } from "../helpers/setup-db";
import { seedReferenceData } from "../helpers/seed";
import { createReferenceRepo } from "../../src/repos/reference-repo";

let pglite: PGlite;
let db: PgliteDatabase;
let repo: ReturnType<typeof createReferenceRepo>;

beforeAll(async () => {
  const result = await setupTestDb();
  pglite = result.pglite;
  db = result.db;
  repo = createReferenceRepo(db as any);
});

afterEach(async () => {
  await truncateAll(pglite);
});

afterAll(async () => {
  await pglite.close();
});

describe("reference-repo", () => {
  describe("getIndicators", () => {
    it("returns the most recent indicators", async () => {
      await seedReferenceData(pglite);

      const ind = await Effect.runPromise(repo.getIndicators());
      expect(Number(ind.uf)).toBe(38500);
      expect(Number(ind.imm)).toBe(500000);
    });

    it("returns indicators for a specific date (temporal)", async () => {
      await seedReferenceData(pglite);
      // Insert newer indicators
      await pglite.exec(`
        INSERT INTO payroll.reference_indicators (effective_date, uf, utm, uta, imm)
        VALUES ('2026-04-01', 39000.00, 67000.00, 804000.00, 510000.00);
      `);

      // Query for March should return March data
      const marchInd = await Effect.runPromise(
        repo.getIndicators("2026-03-15"),
      );
      expect(Number(marchInd.uf)).toBe(38500);

      // Query for April should return April data
      const aprilInd = await Effect.runPromise(
        repo.getIndicators("2026-04-15"),
      );
      expect(Number(aprilInd.uf)).toBe(39000);
    });

    it("fails with NotFoundError when no indicators exist", async () => {
      const result = await Effect.runPromiseExit(repo.getIndicators());
      expect(result._tag).toBe("Failure");
    });
  });

  describe("getAfpRates", () => {
    it("returns AFP rates for latest effective date", async () => {
      await seedReferenceData(pglite);

      const rates = await Effect.runPromise(repo.getAfpRates());
      expect(rates.length).toBeGreaterThanOrEqual(2);
      expect(rates.find((r) => r.afpProvider === "capital")).toBeDefined();
    });

    it("filters to single effective date", async () => {
      await seedReferenceData(pglite);
      // Add newer rates
      await pglite.exec(`
        INSERT INTO payroll.reference_afp_rates (effective_date, afp_provider, commission_rate, sis_rate)
        VALUES ('2026-04-01', 'capital', 1.50, 1.87);
      `);

      const rates = await Effect.runPromise(repo.getAfpRates());
      // Should only return April rates (newest)
      const dates = [...new Set(rates.map((r) => r.effectiveDate))];
      expect(dates).toHaveLength(1);
    });
  });

  describe("getTaxBrackets", () => {
    it("returns tax brackets", async () => {
      await seedReferenceData(pglite);

      const brackets = await Effect.runPromise(repo.getTaxBrackets());
      expect(brackets).toHaveLength(3);
    });
  });

  describe("getFamilyAllowance", () => {
    it("returns family allowance brackets", async () => {
      await seedReferenceData(pglite);

      const brackets = await Effect.runPromise(repo.getFamilyAllowance());
      expect(brackets).toHaveLength(2);
    });
  });

  describe("upsertIndicators", () => {
    it("inserts new indicators", async () => {
      const ind = await Effect.runPromise(
        repo.upsertIndicators({
          effectiveDate: "2026-05-01",
          uf: "40000.00",
          utm: "68000.00",
          uta: "816000.00",
          imm: "520000.00",
        }),
      );

      expect(ind.effectiveDate).toBe("2026-05-01");
      expect(Number(ind.uf)).toBe(40000);
    });

    it("updates existing indicators for same date", async () => {
      await seedReferenceData(pglite);

      const updated = await Effect.runPromise(
        repo.upsertIndicators({
          effectiveDate: "2026-03-01",
          uf: "39000.00",
          utm: "67000.00",
          uta: "804000.00",
          imm: "510000.00",
        }),
      );

      expect(Number(updated.uf)).toBe(39000);

      // Verify only one row exists
      const result = await pglite.query(
        "SELECT COUNT(*) as cnt FROM payroll.reference_indicators WHERE effective_date = '2026-03-01'",
      );
      expect(Number((result.rows[0] as any).cnt)).toBe(1);
    });
  });
});
