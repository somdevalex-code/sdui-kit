# Vue Integration

Use `@sdui-kit/vue` when a Vue 3 app should render the same framework-neutral SDUI payloads as other adapters.

## Registry And Renderer

Register app-owned Vue components, create an `ActionRunner`, and render the node through `SDUIProvider` and `SDUIRenderer`:

```vue
<script setup lang="ts">
import { ActionRunner } from '@sdui-kit/core'
import {
  SDUIProvider,
  SDUIRenderer,
  createVueRegistry,
} from '@sdui-kit/vue'

import AppButton from './AppButton.vue'
import AppCard from './AppCard.vue'

const registry = createVueRegistry({
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
</script>

<template>
  <SDUIProvider :registry="registry" :action-runner="actionRunner">
    <SDUIRenderer :node="node" />
  </SDUIProvider>
</template>
```

Vue children are rendered as the component default slot. A registered component can receive backend children with `<slot />`:

```vue
<template>
  <section class="card">
    <slot />
  </section>
</template>
```

If `props.action` is present, the adapter maps it to `onClick` and does not forward the raw `action` prop.

## Runtime Injection

Components receive only backend props and slots by default. Opt in to runtime props for advanced components:

```ts
const registry = createVueRegistry({
  AdvancedWidget: {
    component: AdvancedWidget,
    metadata: { injectRuntime: true },
  },
})
```

Injected components receive `componentName`, `sduiNode`, `runAction`, and `renderNode`.

## Screen Runtime

Remote screens use the same `ScreenStore` contract as other adapters:

```vue
<script setup lang="ts">
import { ActionRunner, createScreenStore } from '@sdui-kit/core'
import {
  SDUIScreenProvider,
  SDUIScreenRenderer,
  createVueRegistry,
} from '@sdui-kit/vue'

const registry = createVueRegistry({
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
</script>

<template>
  <SDUIScreenProvider
    :registry="registry"
    :action-runner="actionRunner"
    :screen-store="screenStore"
  >
    <SDUIScreenRenderer loading-fallback="Loading..." />
  </SDUIScreenProvider>
</template>
```

`useSDUIScreen()` returns a shallow ref to the current screen state:

```ts
const screenState = useSDUIScreen()

if (screenState.value.status === 'error') {
  reportError(screenState.value.error)
}
```

## Boundaries

- `@sdui-kit/vue` imports Vue and `@sdui-kit/core`.
- It does not import Vue Router, networking clients, query libraries, or modal systems.
- Use [Vue Router](./vue-router.md) when navigation actions should drive Vue Router.
