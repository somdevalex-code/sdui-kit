# Repository Guidelines

## Project Structure & Module Organization

This repository is a pnpm monorepo for SDUI Kit.

- `packages/core` contains the framework-agnostic runtime: protocol types, registry, expressions, actions, and validation.
- `packages/react` contains the React adapter: provider, renderer, hooks, and React registry helpers.
- `packages/forms` contains the headless form runtime and validation helpers.
- `examples/react-basic` is the reference Vite/React integration.
- `docs` is the VitePress documentation site.
- `sdui-example/` is a local legacy reference and is intentionally ignored by git.

Source lives in each package’s `src/` directory. Tests live in `packages/*/tests/`.

## Build, Test, and Development Commands

Use pnpm from the repository root:

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm --filter @sdui-kit/react-basic dev
pnpm --filter @sdui-kit/docs dev
```

- `pnpm build` compiles all packages in `packages/*`.
- `pnpm typecheck` builds packages, then runs TypeScript checks.
- `pnpm test` builds packages, then runs Vitest suites.
- The example and docs commands start local development servers.

## Coding Style & Naming Conventions

Use TypeScript with strict mode. Prefer small, explicit public APIs and keep `@sdui-kit/core` free of framework dependencies.

- Use 2-space indentation.
- Use named exports for package APIs.
- Use PascalCase for React components and classes.
- Use camelCase for functions, variables, props, and action fields.
- Keep backend protocol fields JSON-friendly.

No formatter or linter is configured yet; match the existing style.

## Testing Guidelines

Tests use Vitest. Add tests near the package they cover:

```txt
packages/core/tests/actions.test.ts
packages/react/tests/renderer.test.tsx
packages/forms/tests/formStore.test.ts
```

Name test files `*.test.ts` or `*.test.tsx`. Cover protocol behavior, renderer behavior, action execution, expressions, and form state transitions. Run `pnpm test` before opening a PR.

## Commit & Pull Request Guidelines

The current history uses concise imperative summaries, for example:

```txt
Initial SDUI kit monorepo
```

Use short, descriptive commit messages such as `Add React registry shorthand docs` or `Fix form submit error mapping`.

Pull requests should include:

- A short summary of behavior or API changes.
- Tests run, including exact commands.
- Docs updates for public API or protocol changes.
- Screenshots only when UI examples or docs visuals change.

## Security & Configuration Tips

Do not commit `.env*`, `node_modules/`, `dist/`, coverage output, or generated docs builds. Keep secrets in local environment files or deployment configuration, not in package source or examples.
