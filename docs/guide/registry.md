# Component Registry

The registry maps backend `componentName` values to frontend components. It is intentionally a plain component map.

## Shorthand Map

Use this when component names can be shared with backend exactly:

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

Backend payload:

```json
{
  "componentName": "SummaryCard",
  "props": {
    "title": "Applications",
    "value": "24"
  }
}
```

Matching is case-sensitive. `"SummaryCard"` and `"summaryCard"` are different components.

## Aliases

Use aliases when backend names should be stable or design-system names should stay private:

::: code-group

```tsx [React]
const registry = createReactRegistry({
  text: Text,
  button: Button,
  summaryCard: SummaryCard,
})
```

```ts [Vue]
const registry = createVueRegistry({
  text: Text,
  button: Button,
  summaryCard: SummaryCard,
})
```

:::

## Prop Mapping

Use wrappers when backend props do not match component props:

::: code-group

```tsx [React]
const registry = createReactRegistry({
  badge: ({ label, ...props }) => <Badge {...props}>{label}</Badge>,
})
```

```ts [Vue]
const registry = createVueRegistry({
  badge: BadgeAdapter,
})
```

:::

## Runtime-Aware Components

Most components should stay unaware of SDUI. For advanced components, use adapter hooks:

::: code-group

```tsx [React]
import { useSDUIAction } from '@sdui-kit/react'
```

```ts [Vue]
import { useSDUIAction } from '@sdui-kit/vue'
```

:::

Only opt into injected runtime props when a component really needs them:

::: code-group

```tsx [React]
const registry = createReactRegistry({
  AdvancedWidget: {
    component: AdvancedWidget,
    metadata: { injectRuntime: true },
  },
})
```

```ts [Vue]
const registry = createVueRegistry({
  AdvancedWidget: {
    component: AdvancedWidget,
    metadata: { injectRuntime: true },
  },
})
```

:::
