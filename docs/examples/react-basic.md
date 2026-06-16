# React Basic Example

The reference app lives in `examples/react-basic`. It is a compact React app
that keeps the SDUI wiring, fake backend, screen payloads, app-owned components,
and form integration in separate files.

Run it from the repository root:

```bash
pnpm --filter @sdui-kit/react-basic dev
```

Build it:

```bash
pnpm --filter @sdui-kit/react-basic build
```

Type-check it:

```bash
pnpm --filter @sdui-kit/react-basic typecheck
```

## File Structure

- `src/App.tsx` assembles `createScreenStore`, `ActionRunner`,
  `SDUIScreenProvider`, `SDUIScreenRenderer`, navigation, and toast state.
- `src/demoData.ts` contains the demo application types, seed data, and helpers
  for reading and creating applications.
- `src/demoBackend.ts` is the fake backend. It parses routes, implements the
  `ScreenLoader`, handles submit requests, and returns screen responses.
- `src/screens.ts` builds the SDUI payloads for `/applications`,
  `/applications/:id`, and `/applications/new`.
- `src/registry.ts` maps SDUI `componentName` values to app-owned React
  components with `createReactRegistry`.
- `src/components/layout.tsx` contains shell, toolbar, page header, section, and
  card primitives.
- `src/components/application.tsx` contains stats, list, item, badge, and detail
  components for the application domain.
- `src/components/form.tsx` adapts `@sdui-kit/forms` to React field components
  and submit handling.
- `src/components/primitives.tsx` contains reusable button, text, heading,
  empty, and loading pieces.

## What It Demonstrates

- App-owned React components registered through `createReactRegistry`.
- A fake `ScreenLoader` that returns route-driven SDUI screen payloads.
- List, details, and not-found screens selected by route context.
- A server-driven form with validation and conditional company fields.
- Submit through `ActionRunner.request`, followed by toast feedback and
  navigation to the created application.
- Refresh through the screen store without changing the current route.
