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

Wrappers are also the right place to adapt backend naming to a design-system component. If the backend sends `props.action`, React and Vue adapters create `onClick`; the wrapper can pass it through like any other event prop.

::: code-group

```tsx [React]
const registry = createReactRegistry({
  primaryButton: ({ label, ...props }) => (
    <Button {...props} tone="brand">
      {label}
    </Button>
  ),
})
```

```ts [Vue]
import { defineComponent, h } from 'vue'

const PrimaryButtonAdapter = defineComponent({
  props: {
    label: { type: String, required: true },
  },
  setup(props, { attrs }) {
    return () =>
      h(Button, { ...attrs, tone: 'brand' }, () => props.label)
  },
})

const registry = createVueRegistry({
  primaryButton: PrimaryButtonAdapter,
})
```

:::

## Runtime-Aware Components

Most components should stay unaware of SDUI. A normal clickable component can use `props.action` in the payload and let the framework adapter wire `onClick` automatically:

```json
{
  "componentName": "primaryButton",
  "props": {
    "label": "Submit",
    "action": {
      "type": "request",
      "endpoint": "/api/applications",
      "method": "POST",
      "body": { "$from": "form.values" }
    }
  }
}
```

For advanced components that need to run actions from another prop or event, use adapter hooks. Use a prop name other than `action` when the component itself needs to receive the action object, because `props.action` is reserved for automatic click wiring.

::: code-group

```tsx [React]
import type { SDUIAction } from '@sdui-kit/core'
import { useSDUIAction } from '@sdui-kit/react'

function MenuItem({
  label,
  selectAction,
}: {
  label: string
  selectAction: SDUIAction
}) {
  const runAction = useSDUIAction()

  return <button onClick={() => runAction(selectAction)}>{label}</button>
}

const registry = createReactRegistry({
  menuItem: MenuItem,
})
```

```ts [Vue]
import type { SDUIAction } from '@sdui-kit/core'
import { defineComponent, h, type PropType } from 'vue'
import { useSDUIAction } from '@sdui-kit/vue'

const MenuItem = defineComponent({
  props: {
    label: { type: String, required: true },
    selectAction: {
      type: Object as PropType<SDUIAction>,
      required: true,
    },
  },
  setup(props) {
    const runAction = useSDUIAction()

    return () =>
      h('button', { onClick: () => runAction(props.selectAction) }, props.label)
  },
})

const registry = createVueRegistry({
  menuItem: MenuItem,
})
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

Injected runtime props include `componentName`, `sduiNode`, `runAction`, and `renderNode`. This is useful for layout, editor, analytics, or shell components that need to inspect or render nested SDUI nodes directly.
