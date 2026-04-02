# Security Policy

## Reporting a Vulnerability

**Do not open a public issue.** Email **hello@emisso.ai** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact

We will acknowledge within 48 hours and aim to fix critical issues within 7 days.

## Sensitive Areas

This SDK handles payroll calculations and financial data. Issues in these areas are treated with highest priority:

- Payroll calculation rules (`packages/engine/src/rules/`)
- Income tax bracket logic (`packages/engine/src/rules/income-tax.ts`)
- Previred DDJJ file generation (`packages/engine/src/previred/`)
- Employer cost calculations (`packages/engine/src/rules/employer-pension-reform.ts`)
- Integer arithmetic and rounding (`packages/engine/src/money.ts`)

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Scope

- `@emisso/payroll-cl`
- `@emisso/payroll-api`
- `@emisso/payroll-cli`
