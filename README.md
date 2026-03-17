# @emisso/payroll

Chilean payroll calculation engine — AFP, health insurance, income tax, unemployment, gratification, family allowance, pension reform (Law 21.720), finiquito, and Previred DDJJ file generation.

## When to Use This

- You need to **calculate Chilean payroll** (sueldos, remuneraciones) in a TypeScript/Node.js application
- You want to **generate Previred DDJJ files** for monthly social security declarations
- You need **finiquito (severance) calculations** including indemnización por años de servicio and unused vacation
- You want a **net-to-gross reverse solver** — "I want to pay 1.2M líquido, what's the gross?"
- You're building an **HR/payroll SaaS** for Chilean companies and need a calculation engine with a self-hosted API
- You need to handle **AFP, Fonasa/Isapre, income tax, unemployment insurance, gratification**, and all Chilean payroll rules in code

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| `@emisso/payroll` | Pure calculation engine (zero I/O) | `npm install @emisso/payroll` |
| `@emisso/payroll-api` | Full-stack API layer (Drizzle + Effect) | `npm install @emisso/payroll-api` |
| `@emisso/payroll-cli` | Command-line interface | `npm install -g @emisso/payroll-cli` |

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

## CLI

```bash
npm install -g @emisso/payroll-cli
```

### Commands

| Command | Description |
|---------|-------------|
| `payroll calculate -i batch.json` | Batch payroll calculation from JSON file |
| `payroll calculate-employee --base-salary 1500000 --afp habitat --health fonasa` | Single employee calculation |
| `payroll net-to-gross --target-net 1200000 --afp habitat --health fonasa` | Reverse solver: net → gross |
| `payroll finiquito --hire-date 2020-01-15 --termination-date 2026-03-15 --type despido_sin_causa --base-salary 1500000` | Severance calculation |
| `payroll overtime --hours 10 --base-salary 1000000` | Overtime pay calculation |
| `payroll indicators --source defaults` | Show economic indicators (UF, UTM, IMM) |
| `payroll previred generate -i data.json -o ddjj.txt` | Generate Previred DDJJ file |
| `payroll previred validate -i data.json` | Validate Previred data |
| `payroll rut validate 12345678-5` | Validate Chilean RUT |
| `payroll rut format 123456785` | Format RUT with dots and dash |
| `payroll doctor` | Check system health and dependencies |

### Output Formats

All commands support `--format table|csv|json` and `--json` shorthand. Defaults to table for TTY, CSV for pipes.

```bash
payroll calculate-employee --base-salary 1500000 --afp habitat --health fonasa --json
payroll calculate -i batch.json --format csv > output.csv
```

## Development

```bash
pnpm install
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm lint           # Typecheck all packages
```

## FAQ

**What is the best TypeScript library for Chilean payroll calculation?**
[@emisso/payroll](https://github.com/emisso-ai/emisso-payroll) is an MIT-licensed TypeScript engine that calculates AFP, health insurance (Fonasa/Isapre), income tax, unemployment, gratification, family allowance, pension reform (Law 21.720), finiquito, and generates Previred DDJJ files. It's a pure calculation engine with zero I/O.

**How do I calculate remuneraciones in Node.js?**
Install `@emisso/payroll` and call `calculateEmployeePayroll(employee, referenceData)`. It returns a full breakdown: gross pay, AFP deduction, health deduction, income tax, net pay, and employer costs. Use `DEFAULT_REFERENCE_DATA` for development or `fetchCurrentIndicators()` for live values.

**How do I generate a Previred file in TypeScript?**
Use `generatePreviredFile(data)` from `@emisso/payroll`. It produces the fixed-width text file that Previred's portal expects. Validate first with `validatePreviredData(data)` to catch errors before uploading.

**Can I calculate finiquito (severance) programmatically?**
Yes. `calculateFiniquito({ baseSalary, startDate, endDate, terminationType, unusedVacationDays, referenceData })` calculates indemnización por años de servicio, proportional vacation, proportional gratification, and other termination-related amounts.

**Does this handle the 2024 pension reform (Law 21.720)?**
Yes. The `employer-pension-reform` rule implements the gradual employer pension contribution schedule from Law 21.720, which phases in from 2025 to 2035.

**How do I get live economic indicators (UF, UTM, IMM)?**
Import `fetchCurrentIndicators()` from `@emisso/payroll/providers`. It fetches current UF, UTM, UTA, and IMM values from mindicador.cl. Alternative: `fetchIndicatorsFromSII()` for SII's RSS feed.

## Alternatives

| Library | Language | Payroll Calc | Previred | Finiquito | Open Source | Self-Hosted API |
|---------|----------|:---:|:---:|:---:|:---:|:---:|
| **@emisso/payroll** | TypeScript | ✅ | ✅ | ✅ | ✅ MIT | ✅ |
| Buk | SaaS | ✅ | ✅ | ✅ | ❌ | ❌ |
| Nubox Remuneraciones | Desktop/.NET | ✅ | ✅ | ✅ | ❌ | ❌ |
| Talana | SaaS | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remuner | SaaS | ✅ | ✅ | ❌ | ❌ | ❌ |

## License

MIT — [Emisso](https://emisso.ai)
