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
  engine/   @emisso/payroll-cl   — Pure SDK: payroll calculations, Previred, finiquito (zero DB)
  api/      @emisso/payroll-api  — REST API: Effect TS + Drizzle + PostgreSQL
  cli/      @emisso/payroll-cli  — CLI: Effect CLI for payroll operations
```

## Development Workflow

1. **Fork** and create a branch from `main`
2. **Make changes** following the conventions below
3. **Add a changeset**: `pnpm changeset`
4. **Verify**: `pnpm build && pnpm lint && pnpm test:run`
5. **Open a PR**

## Conventions

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat(afp):`, `fix(previred):`, etc.
- **TypeScript strict**, Zod at boundaries
- **Engine is pure** — zero I/O side effects in the SDK core
- **Integer CLP arithmetic** — all monetary values are integers (CLP), never floats
- **API uses Effect TS** — Repo, Service, Handler layers
- **Tests:** Vitest with hand-verified values. API tests use PGLite.

## Ideas Welcome

- New country payroll rules (Argentina, Uruguay, Paraguay)
- Previred DDJJ improvements
- Finiquito enhancements
- API endpoints
- Documentation and examples

## Reporting Issues

- **Bugs:** Include steps to reproduce and your environment
- **Features:** Describe the use case
- **Security:** Email hello@emisso.ai (see [SECURITY.md](./SECURITY.md))

## License

By contributing, you agree your contributions are licensed under [MIT](./LICENSE).
