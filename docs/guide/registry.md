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

## Runtime Injection

Registered components can also receive runtime helpers directly, but this is opt-in per registration. Use it for components that are intentionally SDUI-aware: shells, menus, editors, compound widgets, analytics wrappers, or components that need to render nested SDUI nodes themselves.

::: code-group

```tsx [React]
import type { SDUIAction } from '@sdui-kit/core'
import type { SDUIInjectedProps } from '@sdui-kit/react'

function ActionMenu({
  items,
  runAction,
}: SDUIInjectedProps & {
  items: Array<{ label: string; action: SDUIAction }>
}) {
  return (
    <div role="menu">
      {items.map((item) => (
        <button key={item.label} onClick={() => runAction(item.action)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

const registry = createReactRegistry({
  actionMenu: {
    component: ActionMenu,
    metadata: { injectRuntime: true },
  },
})
```

```ts [Vue]
import type { SDUIAction } from '@sdui-kit/core'
import type { SDUIInjectedProps } from '@sdui-kit/vue'
import { defineComponent, h, type PropType } from 'vue'

const ActionMenu = defineComponent({
  props: {
    items: {
      type: Array as PropType<Array<{ label: string; action: SDUIAction }>>,
      required: true,
    },
    runAction: {
      type: Function as PropType<SDUIInjectedProps['runAction']>,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h(
        'div',
        { role: 'menu' },
        props.items.map((item) =>
          h('button', {
            key: item.label,
            onClick: () => props.runAction(item.action),
          }, item.label),
        ),
      )
  },
})

const registry = createVueRegistry({
  actionMenu: {
    component: ActionMenu,
    metadata: { injectRuntime: true },
  },
})
```

:::

Injected runtime props include `componentName`, `sduiNode`, `runAction`, and `renderNode`. This is useful for layout, editor, analytics, or shell components that need to inspect or render nested SDUI nodes directly.

There is intentionally no global default that injects runtime props into every registered component. You can wrap multiple registrations with a local helper when a set of components is built specifically for SDUI:

```tsx
import type { ReactSDUIComponent } from '@sdui-kit/react'

const withRuntime = (component: ReactSDUIComponent) => ({
  component,
  metadata: { injectRuntime: true },
})

const registry = createReactRegistry({
  actionMenu: withRuntime(ActionMenu),
  sduiTabs: withRuntime(SDUITabs),
})
```

Avoid using that pattern for ordinary design-system primitives such as `Button`, `Card`, `Text`, or `Badge`. Passing SDUI runtime into everything couples those components to SDUI, increases prop collision risk, and makes reuse outside the SDUI renderer harder. Prefer this order:

1. Use `props.action` for simple click actions.
2. Use `useSDUIAction()` for framework components that need a custom event.
3. Use `metadata: { injectRuntime: true }` for components that are deliberately SDUI-aware.
