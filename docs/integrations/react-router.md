# React Router Integration

React Router should be connected through adapter helpers. Neither `@sdui-kit/core` nor `@sdui-kit/react` should import `react-router-dom`.

## Install

```bash
pnpm add @sdui-kit/core @sdui-kit/react @sdui-kit/react-router react-router-dom
```

Use `@sdui-kit/react-router` with the React renderer from `@sdui-kit/react`.

## Catch-All Boundary

Declare a host-owned catch-all route such as `/app/*`. The boundary component reads React Router state, converts it into `RouteContext`, and asks `ScreenStore` to load the backend screen.

```tsx
import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActionRunner } from '@sdui-kit/core'
import {
  createReactRouterNavigationAdapter,
  createReactRouterRouteContext,
} from '@sdui-kit/react-router'

function SDUIRouteBoundary() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const navigationAdapter = createReactRouterNavigationAdapter({ navigate })
  const route = createReactRouterRouteContext({
    location,
    params,
  })

  const actionRunner = new ActionRunner({
    navigation: navigationAdapter,
    screen: screenStore,
    request: apiRequest,
  })

  useEffect(() => {
    void screenStore.setRoute(route)
  }, [location.pathname, location.search, location.state, params])

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

## Optional Route Objects

For apps that want to build React Router route objects from an SDUI manifest, use the manifest helper at the adapter layer:

```tsx
const routes = createReactRouterRoutesFromManifest(manifest, {
  element: <SDUIRouteBoundary />,
})
```

This preserves function elements as values. If an app needs per-route elements, use the explicit factory field:

```tsx
const routes = createReactRouterRoutesFromManifest(manifest, {
  elementForRoute: (route) => routeElements[route.id],
})
```

This is optional. The primary model remains one host-owned catch-all boundary.

## Backend Payload

Navigation remains framework-neutral:

```json
{
  "type": "navigate",
  "to": "/applications/42",
  "query": { "tab": "documents" },
  "state": { "from": "list" }
}
```

Only the adapter knows this becomes `navigate(...)`.
