# Navigation & Screens

Navigation is a runtime intent, not a router implementation. Core describes `NavigationAdapter`, route context, and screen lifecycle. Apps or adapter packages connect those contracts to React Router, Next, browser history, native navigation, or any other router.

## Route Context

The host app supplies the current route:

```ts
const route = {
  path: '/applications/42',
  screenId: 'applications.details',
  params: { id: '42' },
  query: { tab: 'summary' },
  state: { from: 'list' },
}
```

Core should not read `window.location`, call React hooks, or import router libraries. Those details belong in adapters.

## Catch-All Boundary

The recommended runtime model is a router-level catch-all route. The host app declares a route such as `/app/*`, `[[...slug]]`, or the router equivalent, converts the current router state into `RouteContext`, and calls `screenStore.setRoute(route)`.

```ts
const screenStore = createScreenStore({
  route: { path: '/applications' },
  loader: ({ route, screenId, signal }) =>
    fetchScreen({ route, screenId, signal }),
})
```

Core only sees the framework-neutral route and optional `screenId`. React Router, TanStack Router, Next, browser history, or native navigation remain adapter concerns.

## Screen Response

Backend returns a renderable `SDUIScreenResponse`:

```json
{
  "schemaVersion": "1.0",
  "node": {
    "componentName": "ApplicationDetails",
    "props": {
      "title": "Application #42"
    }
  },
  "data": {
    "id": "42"
  },
  "cache": {
    "key": "screen:/applications/42",
    "ttlMs": 30000,
    "tags": [{ "type": "Application", "id": "42" }]
  }
}
```

`node` is rendered by the framework adapter. `data` and `meta` become runtime context for expressions, actions, and components that opt into runtime access.

Backends can also return framework-neutral routing outcomes:

```json
{
  "schemaVersion": "1.0",
  "status": "redirect",
  "to": "/login",
  "replace": true
}
```

```json
{
  "schemaVersion": "1.0",
  "status": "notFound",
  "message": "Screen was not found"
}
```

Apps decide how to translate those responses into router behavior or not-found UI.

## Route Manifest

A backend may optionally expose `SDUIRouteManifest` for menus, breadcrumbs, permissions, preload, and not-found handling. The manifest is not router config and should not contain `createRoute`, `loader`, `element`, `ReactNode`, `NextPage`, or other library-specific values.

```json
{
  "schemaVersion": "1.0",
  "routes": [
    {
      "id": "applications.list",
      "path": "/applications",
      "screenId": "applications.list",
      "title": "Applications"
    },
    {
      "id": "applications.details",
      "path": "/applications/:id",
      "screenId": "applications.details",
      "params": {
        "id": { "type": "string", "required": true }
      }
    }
  ]
}
```

Adapter packages may map this manifest to optional route objects, but the host app still owns the real router setup.

## Backend-Driven Menus

Menu items can be derived from route definitions:

```ts
const menuItems = manifest.routes
  .filter((route) => route.title)
  .map((route) => ({
    label: route.title,
    to: route.path,
    screenId: route.screenId,
  }))
```

Use `metadata` for application-specific concerns such as permissions or grouping.

## Framework Screen Runtime

Framework adapters compose screen loading through `SDUIScreenProvider` and render through `SDUIScreenRenderer`:

::: code-group

```tsx [React]
<SDUIScreenProvider
  registry={registry}
  actionRunner={actionRunner}
  screenStore={screenStore}
>
  <SDUIScreenRenderer />
</SDUIScreenProvider>
```

```vue [Vue]
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

:::

`SDUIScreenProvider` receives adapters from the app. React exposes screen state through `useSDUIScreen()`. Vue exposes it as a shallow ref from `useSDUIScreen()`.

## Navigation Actions

Backend may request navigation:

```json
{
  "type": "navigate",
  "to": "/applications/42",
  "query": { "tab": "summary" },
  "replace": false
}
```

`ActionRunner` delegates this to `NavigationAdapter.navigate`. `refreshScreen` should refresh the current `ScreenStore` state, not reload the browser page.
