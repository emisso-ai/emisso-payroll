# @emisso/payroll

> Chilean payroll calculation engine — AFP, health, tax, unemployment, Previred, finiquito, and more.

## Overview

@emisso/payroll is a pure TypeScript calculation engine for Chilean payroll (remuneraciones). It handles all mandatory deductions (AFP, health, income tax, unemployment), employer costs (SIS, mutual, pension reform), and generates Previred DDJJ files. It includes a net-to-gross reverse solver and finiquito calculator. An optional API package adds a self-hosted REST layer with PostgreSQL persistence and multi-tenant support.

## Architecture

Monorepo with two packages:

- **`packages/engine`** (`@emisso/payroll`) — Pure calculation engine. Zero I/O, zod only. Optional `/providers` sub-entry for fetching live indicators.
- **`packages/api`** (`@emisso/payroll-api`) — REST API layer. Drizzle ORM + Effect TS + PostgreSQL. Next.js adapter included.

## Getting Started

```bash
npm install @emisso/payroll
```

```typescript
import { calculateEmployeePayroll, DEFAULT_REFERENCE_DATA } from "@emisso/payroll";

const result = calculateEmployeePayroll(
  {
    employeeId: "1",
    rut: "12.345.678-9",
    firstName: "Juan",
    lastName: "Pérez",
    baseSalary: 1_500_000,
    gratificationType: "legal",
    afpCode: "habitat",
    healthPlan: "fonasa",
    contractType: "indefinido",
    earnings: [],
    deductions: [],
  },
  DEFAULT_REFERENCE_DATA
);

console.log(result.netPay); // Líquido a pagar
```

## Key Files

| File | Purpose |
|------|---------|
| `packages/engine/src/index.ts` | Public API — all engine exports |
| `packages/engine/src/types.ts` | Zod schemas + TypeScript types |
| `packages/engine/src/calculator.ts` | Main payroll orchestration |
| `packages/engine/src/net-to-gross.ts` | Binary search reverse solver |
| `packages/engine/src/rules/` | Individual calculation rules (AFP, health, tax, etc.) |
| `packages/engine/src/previred/` | Previred DDJJ file generation + validation |
| `packages/engine/src/money.ts` | CLP integer arithmetic utilities |
| `packages/engine/src/providers/` | Live indicator fetchers (mindicador, SII RSS, AFP rates) |
| `packages/api/src/index.ts` | API package exports |
| `packages/api/src/adapters/next.ts` | Next.js App Router adapter |
| `packages/api/src/db/schema/` | Drizzle database schema |

## Development

```bash
pnpm install              # Install dependencies
pnpm build                # Build all packages (tsup)
pnpm test                 # Run tests (vitest, watch mode)
pnpm test:run             # Run tests (CI mode)
pnpm lint                 # Typecheck (tsc --noEmit)
```

## Code Style

- TypeScript strict mode, ESM-first (CJS compat via tsup)
- Zod for all data validation
- Engine is pure — zero I/O, all calculations are deterministic given inputs
- Money is integer CLP only — all arithmetic via money.ts
- API uses Effect TS layers: Repo → Service → Handler
- Tests use vitest with hand-verified values; API tests use PGLite
- Conventional Commits for git messages
