# @emisso/payroll

Chilean payroll calculation engine (remuneraciones) — AFP pension, health insurance (Fonasa/Isapre), income tax (impuesto único), unemployment insurance (seguro de cesantía), gratification, family allowance, pension reform (Law 21.720), finiquito/severance, overtime, and Previred DDJJ file generation. First open-source TypeScript library for Chilean payroll calculations.

## Structure

```
emisso-payroll/
├── packages/
│   ├── engine/              @emisso/payroll — pure TS, zod only
│   │   ├── src/
│   │   │   ├── types.ts         Zod schemas + interfaces
│   │   │   ├── calculator.ts    Main orchestration (single + batch)
│   │   │   ├── net-to-gross.ts  Binary search reverse solver
│   │   │   ├── money.ts         CLP integer arithmetic
│   │   │   ├── rut.ts           RUT validation + formatting
│   │   │   ├── reference-data.ts  DEFAULT_REFERENCE_DATA (Feb 2026)
│   │   │   ├── rules/           Individual calc rules
│   │   │   │   ├── afp.ts           Mandatory pension (10% + commission)
│   │   │   │   ├── health.ts        Fonasa (7%) / Isapre (7% + UF)
│   │   │   │   ├── income-tax.ts    Progressive brackets in UTM
│   │   │   │   ├── unemployment.ts  Employee + employer by contract type
│   │   │   │   ├── gratification.ts Legal Art. 50 (capped 4.75 IMM) / convenida
│   │   │   │   ├── family-allowance.ts Income-based brackets
│   │   │   │   ├── sis.ts           Employer disability/survival
│   │   │   │   ├── mutual.ts        Workplace accident
│   │   │   │   ├── apv.ts           Voluntary pension savings
│   │   │   │   ├── employer-pension-reform.ts  Law 21.720
│   │   │   │   ├── overtime.ts      50% surcharge
│   │   │   │   └── finiquito.ts     Severance calculation
│   │   │   ├── previred/        Previred DDJJ generation + validation
│   │   │   └── providers/       Live indicators (mindicador, SII RSS, AFP rates)
│   │   └── tests/
│   └── api/                 @emisso/payroll-api — Effect TS, Drizzle, PostgreSQL
│       ├── src/
│       │   ├── core/effect/     AppError, http-response, repo-helpers
│       │   ├── db/schema/       Drizzle tables (employees, payroll-runs, etc.)
│       │   ├── repos/           Data access layer
│       │   ├── services/        Business logic
│       │   ├── handlers/        HTTP handlers + router
│       │   ├── adapters/        Next.js adapter
│       │   └── validation/      Zod request schemas
│       └── tests/helpers/       PGLite test setup
```

## Commands

```bash
pnpm build        # Build all packages (tsup)
pnpm test:run     # Run all tests (CI mode)
pnpm lint         # Typecheck all packages (tsc --noEmit)
```

## Code Patterns

- **Engine:** Pure TypeScript, zero I/O, zod only dependency
- **Money:** Integer CLP only — all arithmetic via money.ts (roundCLP, percentage, clamp)
- **API:** Effect TS layers (Repo → Service → Handler), Data.TaggedError
- **Tests:** Hand-verified values against manual calculations, no mocks, PGLite for DB tests
- **Build:** tsup dual CJS+ESM with .d.ts
- **Providers:** Optional sub-entry `@emisso/payroll/providers` — Effect TS for fetching live indicators

## Key Invariants

- All money amounts are **integer CLP** — no decimals, no floating point
- Engine is **pure** — same inputs always produce same outputs (no network calls)
- `DEFAULT_REFERENCE_DATA` has Feb 2026 values — production apps should fetch live indicators
- AFP commission rates vary by provider — always use current rates
- Income tax uses UTM-based brackets — brackets change monthly with UTM value
- Finiquito indemnización is capped at 11 years (330 days) per labor code
- Previred files must match exact fixed-width format — validate before generating
