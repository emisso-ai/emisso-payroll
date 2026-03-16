# @emisso/payroll — Copilot Instructions

Chilean payroll calculation engine — AFP, health, tax, unemployment, Previred, finiquito, and more.

## Monorepo Structure

- `packages/engine/` — `@emisso/payroll`: Pure calculation engine, zero I/O, zod only.
- `packages/api/` — `@emisso/payroll-api`: REST API with Drizzle ORM + Effect TS + PostgreSQL.

## Code Style

- TypeScript strict mode, ESM-first (CJS compat via tsup)
- Zod for all data validation
- Engine is pure — zero I/O, deterministic calculations
- All money is integer CLP — arithmetic via money.ts
- API uses Effect TS layers: Repo → Service → Handler
- Tests: vitest with hand-verified values; API tests use PGLite
- Conventional Commits: `feat(engine): add overtime rule`

## Testing

```bash
pnpm test:run     # CI mode
pnpm test         # Watch mode
```

## Key Patterns

- Payroll calculation: `calculateEmployeePayroll(employee, referenceData)` returns full breakdown
- Rules are individual modules in `rules/` — each exports a single calculation function
- Reference data (UF, UTM, AFP rates) is passed as input, never fetched inside engine
- Previred files use exact fixed-width format — always validate before generating
- Net-to-gross uses binary search to find gross salary for desired net pay
