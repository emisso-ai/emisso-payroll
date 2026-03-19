---
"@emisso/payroll": patch
---

Make `@emisso/payroll/providers` Deno-compatible by moving the cheerio-dependent AFP scraper to a new `@emisso/payroll/providers/node` entry point. The main providers subpath now only contains Deno-safe providers (fetchCurrentIndicators, fetchIndicatorsFromSII).
