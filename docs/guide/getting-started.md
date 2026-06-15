# Getting Started

Install the core runtime and one UI adapter:

::: code-group

```bash [React]
pnpm add @sdui-kit/core @sdui-kit/react
```

```bash [Vue]
pnpm add @sdui-kit/core @sdui-kit/vue
```

:::

Then use the matching adapter page:

- [React Adapter](../integrations/react.md)
- [Vue Adapter](../integrations/vue.md)

The backend payload is the same for every framework:

```ts
const screen = {
  schemaVersion: '1.0',
  componentName: 'button',
  props: {
    children: 'Save',
    action: {
      type: 'request',
      endpoint: '/api/save',
      method: 'POST',
      body: { id: '123' },
      success: {
        type: 'toast',
        message: 'Saved',
        status: 'success',
      },
    },
  },
}
```

Register app components in the selected framework adapter:

::: code-group

```tsx [React]
const registry = createReactRegistry({
  Text,
  Button,
  SummaryCard,
})
```

```ts [Vue]
const registry = createVueRegistry({
  Text,
  Button,
  SummaryCard,
})
```

:::

The payload uses those keys as `componentName`. Matching is case-sensitive:

```json
{
  "componentName": "SummaryCard",
  "props": {
    "title": "Applications",
    "value": "24"
  }
}
```

The packages do not ship a design system. The consuming app owns visual components, styling, router, API client, modals and notifications.

Use [Component Registry](./registry.md), [Actions](./actions.md), and [Navigation & Screens](./navigation-screens.md) for the framework-neutral contracts.
