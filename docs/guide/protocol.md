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

Keep the boundary clear:

- Put renderable component inputs in `props`.
- Put child nodes in `children` or `props.children`.
- Put behavior in `props.action` when the component should trigger an SDUI action.
- Put non-rendering diagnostics, experiment flags, permissions hints, or analytics labels in `metadata`.

## Action Payloads

Actions are regular props. React and Vue adapters map `props.action` to a click handler for components that do not already provide `onClick`, then pass the action to `ActionRunner`.

```json
{
  "componentName": "Button",
  "props": {
    "children": "Open details",
    "action": {
      "type": "navigate",
      "to": "/applications/42",
      "query": { "tab": "summary" }
    }
  },
  "metadata": {
    "analyticsKey": "applications.openDetails"
  }
}
```

Nested children can carry their own actions:

```json
{
  "componentName": "Card",
  "props": {
    "title": "Application #42"
  },
  "children": [
    {
      "componentName": "Text",
      "props": {
        "children": "Ready for review"
      }
    },
    {
      "componentName": "Button",
      "props": {
        "children": "Approve",
        "action": {
          "type": "request",
          "endpoint": "/api/applications/42/approve",
          "method": "POST",
          "invalidate": [{ "type": "Application", "id": "42" }],
          "success": {
            "type": "refreshScreen"
          }
        }
      }
    }
  ],
  "metadata": {
    "experiment": "application-card-v2"
  }
}
```

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

::: code-group

```tsx [React]
const registry = createReactRegistry({
  Badge,
})
```

```ts [Vue]
const registry = createVueRegistry({
  Badge,
})
```

:::

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

Framework adapters do not inject SDUI internals into every component by default. Components receive backend props plus rendered children or slots. If `props.action` is provided, React and Vue adapters map it to `onClick` and do not forward the raw `action` prop.

Advanced components can access runtime behavior through hooks:

::: code-group

```tsx [React]
import { useSDUI, useSDUIAction } from '@sdui-kit/react'
```

```ts [Vue]
import { useSDUI, useSDUIAction } from '@sdui-kit/vue'
```

:::

If a registered component must receive runtime props directly, register it with metadata `{ injectRuntime: true }`.

::: code-group

```tsx [React]
const registry = createReactRegistry({
  advancedWidget: {
    component: AdvancedWidget,
    metadata: { injectRuntime: true },
  },
})
```

```ts [Vue]
const registry = createVueRegistry({
  advancedWidget: {
    component: AdvancedWidget,
    metadata: { injectRuntime: true },
  },
})
```

:::

Unknown components should use the adapter fallback component. In development, show the missing component name. In production, prefer a quiet placeholder or omit the block.

Validate backend payloads with `validateSDUINode` before rendering when payloads are remote or user-targeted.
