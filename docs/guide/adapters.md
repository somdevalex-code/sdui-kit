# Adapters

Core has no opinion about networking, routing, stores, notifications or modal systems. Connect those through small adapters owned by the app or by integration packages.

```ts
const actionRunner = new ActionRunner({
  request: ({ endpoint, method, body, params, headers }) =>
    fetch(endpoint, {
      method,
      headers: headers as HeadersInit,
      body: method === 'GET' ? undefined : JSON.stringify(body),
    }).then((response) => response.json()),

  toast: (action) => toast.show(action.message, { status: action.status }),

  navigate: (action) => router.push({
    pathname: action.to,
    query: action.query,
  }),

  confirm: (config) => confirmDialog.open(config),
})
```

For larger apps, split adapters by concern:

- [Navigation & Screens](./navigation-screens.md) for route context and screen loading.
- [Data & Cache Adapters](./data-cache-adapters.md) for requests, invalidation and screen stores.
- [Vue](../integrations/vue.md), [Vue Router](../integrations/vue-router.md), [TanStack Query](../integrations/tanstack-query.md), [TanStack Router](../integrations/tanstack-router.md), [React Router](../integrations/react-router.md), [Next App Router](../integrations/next.md), [Browser History](../integrations/browser-history.md) and [RTK Query](../integrations/rtk-query.md) for integration patterns.

To support another framework, implement a renderer that:

- accepts a `ComponentRegistry`.
- walks `SDUINode` trees.
- renders registered components.
- passes actions to `ActionRunner`.
- handles unknown components through a fallback.
