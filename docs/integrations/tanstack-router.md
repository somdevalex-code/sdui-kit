# TanStack Router Integration

TanStack Router should stay outside core. Use `@sdui-kit/tanstack-router` to convert router state into `RouteContext` and keep screen loading in `ScreenStore`.

## Install

```bash
pnpm add @sdui-kit/core @sdui-kit/react @sdui-kit/tanstack-router @tanstack/react-router
```

Use `@sdui-kit/tanstack-router` with the renderer package for your UI framework.
The command above shows the React path.

## Catch-All Boundary

Declare a catch-all route in the host app and render the SDUI screen boundary from that route.

```tsx
import { ActionRunner } from '@sdui-kit/core'
import {
  createTanStackCatchAllRouteOptions,
  createTanStackRouteContext,
} from '@sdui-kit/tanstack-router'

export const sduiRouteOptions = createTanStackCatchAllRouteOptions({
  path: '$',
  component: SDUIRouteBoundary,
})

function SDUIRouteBoundary() {
  const route = createTanStackRouteContext({
    pathname: routerState.location.pathname,
    params: match.params,
    search: routerState.location.search,
    state: historyState,
  })

  const actionRunner = new ActionRunner({
    navigation,
    screen: screenStore,
    request: apiRequest,
  })

  useEffect(() => {
    void screenStore.setRoute(route)
  }, [route.path, route.params, route.query])

  return (
    <SDUIScreenProvider
      registry={registry}
      actionRunner={actionRunner}
      screenStore={screenStore}
    >
      <SDUIScreenRenderer />
    </SDUIScreenProvider>
  )
}
```

The exact hooks depend on how the host app configures TanStack Router. The adapter helper only needs pathname, params, search, optional state, and optional `screenId`.

## Optional Manifest Mapping

If your backend exposes `SDUIRouteManifest`, the adapter can convert it into route-option-like objects:

```ts
const routeOptions = createTanStackRoutesFromManifest(manifest, {
  component: SDUIRouteBoundary,
})
```

This preserves TanStack option functions as values. If an app needs per-route values, use the explicit factory fields:

```ts
const routeOptions = createTanStackRoutesFromManifest(manifest, {
  componentForRoute: (route) => routeComponents[route.id],
})
```

Manifest paths stay framework-neutral. The adapter converts dynamic segments such as `/applications/:id` to TanStack Router paths such as `/applications/$id`, and optional segments such as `/users/:id?` to `/users/{-$id}`.

The SDUI route id is preserved as `staticData.routeId`. It is not emitted as the top-level TanStack `id` when a `path` is present.

This is optional. Backend manifests remain framework-neutral and should not contain TanStack `createRoute`, loaders, or components.
