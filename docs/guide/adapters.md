# Adapters

Core has no opinion about networking, routing, notifications or modal systems. Connect those through `ActionRunner` adapters.

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

To support another framework, implement a renderer that:

- accepts a `ComponentRegistry`.
- walks `SDUINode` trees.
- renders registered components.
- passes actions to `ActionRunner`.
- handles unknown components through a fallback.
