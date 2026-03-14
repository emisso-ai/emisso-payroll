# @emisso/payroll

Chilean payroll calculation engine — AFP, health insurance, income tax, unemployment, gratification, family allowance, pension reform (Law 21.720), finiquito, and Previred DDJJ file generation.

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| `@emisso/payroll` | Pure calculation engine (zero I/O) | `npm install @emisso/payroll` |
| `@emisso/payroll-api` | Full-stack API layer (Drizzle + Effect) | `npm install @emisso/payroll-api` |

## Quick Start — Engine

```bash
npm install @emisso/payroll
```

```typescript
import {
  calculateEmployeePayroll,
  DEFAULT_REFERENCE_DATA,
} from "@emisso/payroll";

const result = calculateEmployeePayroll(
  {
    employeeId: "1",
    rut: "12.345.678-9",
    firstName: "Juan",
    lastName: "Pérez",
    baseSalary: 1_500_000,
    gratificationType: "legal",
    colacion: 50_000,
    movilizacion: 30_000,
    afpCode: "habitat",
    afpFund: "b",
    healthPlan: "fonasa",
    familyAllowanceLoads: 2,
    contractType: "indefinido",
    earnings: [],
    deductions: [],
  },
  DEFAULT_REFERENCE_DATA
);

console.log(result.netPay);          // Líquido a pagar
console.log(result.deductions.afp);  // AFP deduction
console.log(result.employerCosts);   // Employer cost breakdown
```

> `DEFAULT_REFERENCE_DATA` uses Feb 2026 values. For production, fetch live indicators:
>
> ```typescript
> import { fetchCurrentIndicators } from "@emisso/payroll/providers";
> const indicators = await fetchCurrentIndicators();
> ```

### Batch Payroll

```typescript
import { calculatePayroll, DEFAULT_REFERENCE_DATA } from "@emisso/payroll";

const results = await calculatePayroll({
  employees: [employee1, employee2, employee3],
  referenceData: DEFAULT_REFERENCE_DATA,
  periodYear: 2026,
  periodMonth: 3,
});
```

### Previred File

```typescript
import { generatePreviredFile, validatePreviredData } from "@emisso/payroll";

const errors = validatePreviredData(previredData);
if (errors.length === 0) {
  const fileContent = generatePreviredFile(previredData);
  // Write to .txt for upload to previred.com
}
```

### Net-to-Gross

```typescript
import { calculateNetToGross, DEFAULT_REFERENCE_DATA } from "@emisso/payroll";

// "I want to pay 1.2M líquido — what's the gross?"
const gross = calculateNetToGross(1_200_000, {
  afpCode: "habitat",
  healthPlan: "fonasa",
  referenceData: DEFAULT_REFERENCE_DATA,
});
```

### Finiquito

```typescript
import { calculateFiniquito } from "@emisso/payroll";

const finiquito = calculateFiniquito({
  baseSalary: 1_500_000,
  startDate: new Date("2020-01-15"),
  endDate: new Date("2026-03-13"),
  terminationType: "employer_needs",
  unusedVacationDays: 12,
  referenceData: DEFAULT_REFERENCE_DATA,
});
```

## Quick Start — Self-Hosted API

For teams that need a REST API with persistence, multi-tenant, and employee management.

```bash
npm install @emisso/payroll-api
```

**1. Set environment variables:**

```bash
# .env.local
EMISSO_DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
```

**2. Run migrations:**

```bash
npx @emisso/payroll-api migrate
```

**3. Mount in your Next.js app:**

```typescript
// app/api/payroll/[...path]/route.ts
import { createPayrollRouter } from "@emisso/payroll-api/next";

export const { GET, POST, PUT, DELETE } = createPayrollRouter({
  databaseUrl: process.env.EMISSO_DATABASE_URL!,
  basePath: "/api/payroll",
  resolveTenantId: async (req) => {
    const session = await getSession(req); // your auth
    return session.tenantId;
  },
});
```

**4. Use the API:**

```bash
# Create employee
curl -X POST http://localhost:3000/api/payroll/employees \
  -H "Content-Type: application/json" \
  -d '{"rut":"12.345.678-9","firstName":"Juan","lastName":"Pérez","baseSalary":1500000}'

# Run payroll
curl -X POST http://localhost:3000/api/payroll/runs \
  -H "Content-Type: application/json" \
  -d '{"period":"2026-03"}'
```

## API Reference

### Engine Exports (`@emisso/payroll`)

| Export | Description |
|--------|-------------|
| `calculatePayroll(input)` | Batch calculation for multiple employees |
| `calculateEmployeePayroll(employee, refData)` | Single employee calculation |
| `calculateNetToGross(netPay, options)` | Reverse calculation: net → gross |
| `calculateFiniquito(input)` | Severance/termination calculation |
| `calculateOvertime(hours, baseSalary, type)` | Overtime pay calculation |
| `generatePreviredFile(data)` | Generate Previred DDJJ text file |
| `validatePreviredData(data)` | Validate data before Previred generation |
| `DEFAULT_REFERENCE_DATA` | Default economic indicators (Feb 2026) |
| `formatRut(rut)` / `validateRut(rut)` | RUT utilities |

### Providers (`@emisso/payroll/providers`)

| Export | Description |
|--------|-------------|
| `fetchCurrentIndicators()` | UF, UTM, UTA, IMM from mindicador.cl |
| `fetchIndicatorsFromSII()` | Indicators from SII RSS feed |
| `fetchAFPRates()` | Current AFP commission rates |

## Payroll Rules

| Rule | Module | Description |
|------|--------|-------------|
| AFP | `rules/afp` | Mandatory pension (10% + commission) |
| Health | `rules/health` | Fonasa (7%) or Isapre (7% + additional UF) |
| Income Tax | `rules/income-tax` | Progressive brackets in UTM |
| Unemployment | `rules/unemployment` | Employee + employer portions by contract type |
| Gratification | `rules/gratification` | Legal (Art. 50, capped at 4.75 IMM) or convenida |
| Family Allowance | `rules/family-allowance` | Brackets by income level |
| SIS | `rules/sis` | Employer disability/survival insurance |
| Mutual | `rules/mutual` | Workplace accident insurance |
| APV | `rules/apv` | Voluntary pension savings |
| Pension Reform | `rules/employer-pension-reform` | Law 21.720 employer contribution |
| Overtime | `rules/overtime` | 50% surcharge calculation |
| Finiquito | `rules/finiquito` | Severance: indemnización, vacaciones, etc. |

## Development

```bash
pnpm install
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm lint           # Typecheck all packages
```

## License

MIT — [Emisso](https://emisso.ai)
