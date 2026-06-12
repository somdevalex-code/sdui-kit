# Component Registry

The registry maps backend `componentName` values to frontend components. It is intentionally a plain component map.

## Shorthand Map

Use this when component names can be shared with backend exactly:

```tsx
const registry = createReactRegistry({
  Text,
  Button,
  SummaryCard,
})
```

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

```tsx
const registry = createReactRegistry({
  text: Text,
  button: Button,
  summaryCard: SummaryCard,
})
```

## Prop Mapping

Use wrappers when backend props do not match component props:

```tsx
const registry = createReactRegistry({
  badge: ({ label, ...props }) => <Badge {...props}>{label}</Badge>,
})
```

## Runtime-Aware Components

Most components should stay unaware of SDUI. For advanced components, use hooks:

```tsx
import { useSDUIAction } from '@sdui-kit/react'
```

Only opt into injected runtime props when a component really needs them:

```tsx
const registry = createReactRegistry({
  AdvancedWidget: {
    component: AdvancedWidget,
    metadata: { injectRuntime: true },
  },
})
```
