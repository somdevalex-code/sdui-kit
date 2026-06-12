# Navigation & Screens

Navigation is a runtime intent, not a router implementation. Core describes `NavigationAdapter`, route context, and screen lifecycle. Apps or adapter packages connect those contracts to React Router, Next, browser history, native navigation, or any other router.

## Route Context

The host app supplies the current route:

```ts
const route = {
  path: '/applications/42',
  params: { id: '42' },
  query: { tab: 'summary' },
  state: { from: 'list' },
}
```

Core should not read `window.location`, call React hooks, or import router libraries. Those details belong in adapters.

## Screen Response

Backend returns a `SDUIScreenResponse`:

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

## React Screen Runtime

React apps should compose screen loading through `SDUIScreenProvider` and render through `SDUIScreenRenderer`:

```tsx
<SDUIScreenProvider
  registry={registry}
  actionRunner={actionRunner}
  screenStore={screenStore}
>
  <SDUIScreenRenderer />
</SDUIScreenProvider>
```

`SDUIScreenProvider` receives adapters from the app. It should expose loading, success, error, and refreshing states through `useSDUIScreen`.

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
