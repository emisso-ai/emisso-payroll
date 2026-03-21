# @emisso/payroll

## 0.2.1

### Patch Changes

- 77b9354: Clarify isapreAmount as total Isapre plan cost in UF (not additional). The previous "Additional UF amount" description caused confusion, leading to understated health deductions and inflated income tax.

## 0.2.0

### Minor Changes

- 3c4f4e1: Add well-known earning types (bonus, viatico, aguinaldo, etc.) with legally-mandated imponible/taxable defaults based on Art. 41 Código del Trabajo. The isTaxable and isImponible fields are now optional — inferred from type when omitted.

## 0.1.3

### Patch Changes

- 638c241: Fix AFP calculation to include the mandatory 10% pension contribution. Previously only the AFP commission rate was applied, producing incorrect deductions and net pay.

## 0.1.2

### Patch Changes

- 48eabd7: Make `@emisso/payroll/providers` Deno-compatible by moving the cheerio-dependent AFP scraper to a new `@emisso/payroll/providers/node` entry point.

## 0.1.1

### Patch Changes

- b94ee8d: Add @emisso/payroll-cli package and fix engine export paths
