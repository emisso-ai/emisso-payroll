# @emisso/payroll

Chilean payroll calculation engine — AFP, health, tax, unemployment, Previred, and more.

## Install

```bash
npm install @emisso/payroll
```

## Usage

```typescript
import {
  calculateEmployeePayroll,
  DEFAULT_REFERENCE_DATA,
} from '@emisso/payroll';

const result = calculateEmployeePayroll(
  {
    employeeId: '1',
    rut: '12345678-9',
    firstName: 'Juan',
    lastName: 'Perez',
    baseSalary: 1_000_000,
    gratificationType: 'legal',
    colacion: 50_000,
    movilizacion: 30_000,
    afpCode: 'capital',
    afpFund: 'c',
    healthPlan: 'fonasa',
    familyAllowanceLoads: 2,
    earnings: [],
    deductions: [],
  },
  DEFAULT_REFERENCE_DATA,
);

console.log(result.netPay); // Net pay in CLP
console.log(result.employerCosts.total); // Total employer costs
```

## Providers (optional)

Fetch live reference data from official Chilean sources:

```typescript
import { Effect } from 'effect';
import { fetchCurrentIndicators } from '@emisso/payroll/providers';

const program = Effect.gen(function* () {
  const indicators = yield* fetchCurrentIndicators();
  console.log(`UF: ${indicators.uf}, UTM: ${indicators.utm}`);
});

Effect.runPromise(program);
```

Providers require `effect` as a peer dependency.

## License

MIT
