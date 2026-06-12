# React Basic Example

The reference app lives in `examples/react-basic`.

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

## What It Demonstrates

- `createReactRegistry` with app-owned components.
- `SDUIProvider` and `SDUIRenderer`.
- A form described by backend-compatible JSON.
- Dynamic field visibility with `visibleWhen`.
- Submit through `ActionRunner`.
- Toast feedback through an app adapter.

Open `examples/react-basic/src/App.tsx` to see the screen payload and action adapters.
