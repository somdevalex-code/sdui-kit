# React Adapter

Use `@sdui-kit/react` when a React app should render framework-neutral SDUI payloads with app-owned components.

## Registry And Renderer

Register React components, create an `ActionRunner`, and render the node through `SDUIProvider` and `SDUIRenderer`:

```tsx
import { ActionRunner } from '@sdui-kit/core'
import {
  SDUIProvider,
  SDUIRenderer,
  createReactRegistry,
} from '@sdui-kit/react'

import { AppButton } from './AppButton'
import { AppCard } from './AppCard'

const registry = createReactRegistry({
  AppButton,
  AppCard,
})

const actionRunner = new ActionRunner({
  request: ({ endpoint, method, body, params, headers, signal }) =>
    api.request({ url: endpoint, method, data: body, params, headers, signal }),
  toast: (action) => toast.show(action.message, { status: action.status }),
})

const node = {
  componentName: 'AppCard',
  props: {
    children: {
      componentName: 'AppButton',
      props: {
        children: 'Submit',
        action: {
          type: 'request',
          endpoint: '/api/applications',
          method: 'POST',
          body: { status: 'submitted' },
        },
      },
    },
  },
}

export function App() {
  return (
    <SDUIProvider registry={registry} actionRunner={actionRunner}>
      <SDUIRenderer node={node} />
    </SDUIProvider>
  )
}
```

React children are rendered as `children`. If `props.action` is present, the adapter maps it to `onClick` and does not forward the raw `action` prop.

## Runtime Injection

Components receive only backend props and rendered children by default. Opt in to runtime props for advanced components:

```tsx
const registry = createReactRegistry({
  AdvancedWidget: {
    component: AdvancedWidget,
    metadata: { injectRuntime: true },
  },
})
```

Injected components receive `componentName`, `sduiNode`, `runAction`, and `renderNode`.

## Screen Runtime

Remote screens use the same `ScreenStore` contract as other adapters:

```tsx
import { ActionRunner, createScreenStore } from '@sdui-kit/core'
import {
  SDUIScreenProvider,
  SDUIScreenRenderer,
  createReactRegistry,
} from '@sdui-kit/react'

const registry = createReactRegistry({
  AppButton,
  AppCard,
})

const screenStore = createScreenStore({
  route: { path: '/applications' },
  loader: ({ route, signal }) => fetchScreen({ route, signal }),
})

const actionRunner = new ActionRunner({
  screen: screenStore,
  request: apiRequest,
})

export function App() {
  return (
    <SDUIScreenProvider
      registry={registry}
      actionRunner={actionRunner}
      screenStore={screenStore}
    >
      <SDUIScreenRenderer loadingFallback="Loading..." />
    </SDUIScreenProvider>
  )
}
```

`useSDUIScreen()` returns the current screen state:

```tsx
const screenState = useSDUIScreen()

if (screenState.status === 'error') {
  reportError(screenState.error)
}
```

## Boundaries

- `@sdui-kit/react` imports React and `@sdui-kit/core`.
- It does not import React Router, networking clients, query libraries, or modal systems.
- Use [React Router](./react-router.md) when navigation actions should drive React Router.
