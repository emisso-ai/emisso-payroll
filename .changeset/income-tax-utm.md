---
"@emisso/payroll-cl": patch
---

Fix income tax to use UTM instead of UF for bracket lookup. Chilean tax brackets (Impuesto Único) are denominated in UTM, not UF. This was placing employees in higher brackets and inflating income tax.
