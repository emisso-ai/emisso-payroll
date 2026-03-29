# Security Policy

## Reporting a Vulnerability

**Do not open a public issue.** Email **hello@emisso.ai** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact

We will acknowledge within 48 hours and aim to fix critical issues within 7 days.

## Sensitive Areas

This SDK calculates real wages. Calculation accuracy directly affects workers' pay. Issues that could cause incorrect payroll amounts are treated with highest priority:

- Core calculation engine (`packages/engine/src/calculator.ts`)
- Tax calculation rules (`packages/engine/src/rules/`)
- Net-to-gross reverse solver (`packages/engine/src/net-to-gross.ts`)
- Previred DDJJ file generation (`packages/engine/src/previred/`)

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Scope

- `@emisso/payroll-cl`
- `@emisso/payroll-api`
