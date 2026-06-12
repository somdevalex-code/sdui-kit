# SDUI Kit

Framework-agnostic Server-Driven UI runtime with adapters for UI frameworks.

This workspace contains an MVP package split:

- `@sdui-kit/core` - protocol types, component registry, expressions, action runner and payload validation.
- `@sdui-kit/react` - React provider, renderer and registry helpers.
- `@sdui-kit/forms` - headless form state, validation, dynamic field state and submit integration.
- `examples/react-basic` - a small React/Vite integration example.
- `docs` - VitePress documentation site with protocol and recipe examples.

## Install

```bash
pnpm install
pnpm build
pnpm example:react
```

## Minimal React Usage

```tsx
import { ActionRunner } from '@sdui-kit/core'
import { SDUIProvider, SDUIRenderer, createReactRegistry } from '@sdui-kit/react'

const registry = createReactRegistry({
  text: Text,
  button: Button,
})

const actionRunner = new ActionRunner({
  toast: (action) => console.log(action.message),
})

const screen = {
  schemaVersion: '1.0',
  componentName: 'button',
  props: {
    children: 'Save',
    variant: 'primary',
    action: {
      type: 'toast',
      message: 'Saved',
      status: 'success',
    },
  },
}

export function App() {
  return (
    <SDUIProvider registry={registry} actionRunner={actionRunner}>
      <SDUIRenderer node={screen} />
    </SDUIProvider>
  )
}
```

The registry can be a simple component map:

```tsx
const registry = createReactRegistry({
  Text,
  Button,
  SummaryCard,
})
```

Backend `componentName` values match those keys exactly:

```json
{
  "componentName": "SummaryCard",
  "props": {
    "title": "Applications",
    "value": "24"
  }
}
```

Or wrappers when backend prop names need mapping:

```tsx
const registry = createReactRegistry({
  badge: ({ label, ...props }) => <Badge {...props}>{label}</Badge>,
})
```

See `docs/guide/getting-started.md` for the full walkthrough.
