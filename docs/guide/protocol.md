# Protocol

The minimal SDUI node shape:

```json
{
  "schemaVersion": "1.0",
  "componentName": "card",
  "props": {
    "children": "Hello"
  },
  "metadata": {
    "experiment": "application-card-v2"
  }
}
```

Fields:

- `schemaVersion` identifies the backend contract version.
- `componentName` must match a registered frontend component.
- `props` are passed to that component as normal component props.
- `children` can live in `props.children` or as a top-level `children` field.
- `metadata` is available for analytics, experiments or debugging.

## Passing Props

Backend sends props inside the `props` object:

```json
{
  "componentName": "badge",
  "props": {
    "label": "Active applications",
    "tone": "success",
    "count": 12
  }
}
```

The frontend registers a component that receives those props:

```tsx
const registry = createReactRegistry({
  Badge,
})
```

Then backend uses the same key:

```json
{
  "componentName": "Badge",
  "props": {
    "label": "Active applications",
    "tone": "success",
    "count": 12
  }
}
```

If backend prop names need mapping, use a wrapper:

```tsx
const registry = createReactRegistry({
  badge: ({ label, ...props }) => <Badge {...props}>{label}</Badge>,
})
```

The React adapter does not inject SDUI internals into every component by default. Components receive backend props plus rendered `children`. If `props.action` is provided, the adapter maps it to `onClick` and does not forward the raw `action` prop.

Advanced components can access runtime behavior through hooks:

```tsx
import { useSDUI, useSDUIAction } from '@sdui-kit/react'
```

If a registered component must receive runtime props directly, register it with metadata `{ injectRuntime: true }`.

```tsx
const registry = createReactRegistry({
  advancedWidget: {
    component: AdvancedWidget,
    metadata: { injectRuntime: true },
  },
})
```

Unknown components should use the adapter fallback component. In development, show the missing component name. In production, prefer a quiet placeholder or omit the block.

Validate backend payloads with `validateSDUINode` before rendering when payloads are remote or user-targeted.
