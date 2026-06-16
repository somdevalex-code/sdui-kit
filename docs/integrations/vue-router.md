# Vue Router Integration

Vue Router should be connected through adapter helpers. Neither `@sdui-kit/core` nor `@sdui-kit/vue` should import `vue-router`.

## Install

```bash
pnpm add @sdui-kit/core @sdui-kit/vue @sdui-kit/vue-router vue-router
```

Use `@sdui-kit/vue-router` with the Vue renderer from `@sdui-kit/vue`.

## Catch-All Boundary

Declare a host-owned catch-all route and load SDUI screens from that boundary:

```vue
<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ActionRunner } from '@sdui-kit/core'
import {
  SDUIScreenProvider,
  SDUIScreenRenderer,
} from '@sdui-kit/vue'
import {
  createVueRouterNavigationAdapter,
  createVueRouterRouteContext,
} from '@sdui-kit/vue-router'

const route = useRoute()
const router = useRouter()
const navigation = createVueRouterNavigationAdapter({ router })
const actionRunner = new ActionRunner({
  navigation,
  screen: screenStore,
  request: apiRequest,
})

watch(
  () => [route.path, route.query, route.params, route.meta],
  () => {
    const screenId =
      typeof route.meta.screenId === 'string'
        ? route.meta.screenId
        : undefined

    void screenStore.setRoute(
      createVueRouterRouteContext({
        route,
        screenId,
      }),
    )
  },
  { immediate: true },
)
</script>

<template>
  <SDUIScreenProvider
    :registry="registry"
    :action-runner="actionRunner"
    :screen-store="screenStore"
  >
    <SDUIScreenRenderer />
  </SDUIScreenProvider>
</template>
```

## Route Records

Create a catch-all route record for the SDUI boundary:

```ts
import { createRouter, createWebHistory } from 'vue-router'
import {
  createVueRouterCatchAllRoute,
  createVueRouterRoutesFromManifest,
} from '@sdui-kit/vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    createVueRouterCatchAllRoute({
      name: 'sdui.catchAll',
      component: SDUIRouteBoundary,
    }),
  ],
})
```

For apps that load `SDUIRouteManifest`, route records can be derived at the adapter layer:

```ts
const routes = createVueRouterRoutesFromManifest(manifest, {
  component: SDUIRouteBoundary,
})
```

Route metadata includes `routeId`, `screenId`, `title`, `metadata`, and the original `sduiRoute`.

## Backend Payload

Navigation remains framework-neutral:

```json
{
  "type": "navigate",
  "to": "/applications/42",
  "query": { "tab": "documents" },
  "replace": false,
  "state": { "from": "list" }
}
```

The adapter maps this to `router.push(...)` or `router.replace(...)`. `goBack` maps to `router.back()`.
