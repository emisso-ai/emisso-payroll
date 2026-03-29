# Contributing to @emisso/payroll

Thanks for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/emisso-ai/emisso-payroll.git
cd emisso-payroll
pnpm install
pnpm build
pnpm test:run
pnpm lint
```

## Project Structure

```
packages/
  engine/   @emisso/payroll-cl   — Pure calculation engine (zero I/O, zod only)
  api/      @emisso/payroll-api  — REST API: Effect TS + Drizzle + PostgreSQL
```

## Development Workflow

1. **Fork** and create a branch from `main`
2. **Make changes** following the conventions below
3. **Add a changeset**: `pnpm changeset`
4. **Verify**: `pnpm build && pnpm lint && pnpm test:run`
5. **Open a PR**

## Conventions

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat(afp):`, `fix(tax):`, etc.
- **TypeScript strict**, Zod at boundaries
- **Engine is pure** — zero I/O, all calculations are deterministic
- **Money is integer CLP** — all arithmetic via `money.ts`, never use floating point
- **API uses Effect TS** — Repo, Service, Handler layers
- **Tests:** Vitest, hand-verified values

## Testing Requirements

**Calculation changes MUST include hand-verified test cases.** Verify expected values against official sources:

- SII income tax tables
- AFP commission rate tables
- Previred online calculators
- Official UF/UTM/IMM values from mindicador.cl

API tests use PGLite for real PostgreSQL integration testing.

## Ideas Welcome

- New deduction/earning types
- Multi-country payroll support
- Previred format updates
- Provider integrations (new indicator sources)
- Documentation and examples

## Reporting Issues

- **Bugs:** Include expected vs actual calculation values
- **Features:** Describe the use case
- **Security:** Email hello@emisso.ai (see [SECURITY.md](./SECURITY.md))

## License

By contributing, you agree your contributions are licensed under [MIT](./LICENSE).
