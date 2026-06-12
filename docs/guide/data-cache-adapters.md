# Data & Cache Adapters

Core stays headless by depending on contracts instead of data libraries. Apps can implement these contracts with `fetch`, Axios, TanStack Query, RTK Query, GraphQL clients, or local mocks.

## DataAdapter

`DataAdapter` executes backend-driven request actions:

```ts
const dataAdapter: DataAdapter = {
  request: ({ endpoint, method, body, params, headers, signal }, context) => {
    return api.request({
      url: endpoint,
      method,
      data: body,
      params,
      headers,
      signal,
    })
  },
}
```

Request actions should not know which HTTP client or query library is used.

## CacheAdapter

`CacheAdapter` bridges invalidation and refetch behavior:

```ts
const cacheAdapter: CacheAdapter = {
  get: (key) => cache.get(key),
  set: (key, value, options) => cache.set(key, value, options),
  invalidate: (tags) => {
    for (const tag of tags) {
      cache.invalidate(tag)
    }
  },
}
```

Use stable tags in backend responses and mutation actions:

```json
{
  "type": "request",
  "endpoint": "/api/applications/42",
  "method": "PATCH",
  "body": { "$from": "form.values" },
  "invalidate": [{ "type": "Application", "id": "42" }]
}
```

## ScreenStore

`ScreenStore` owns the current screen state:

```ts
type status = 'idle' | 'loading' | 'success' | 'error' | 'refreshing'
```

It loads `SDUIScreenResponse` from a route, stores the latest response, exposes errors, and supports refresh. The store may be custom, in-memory, TanStack-backed, Redux-backed, or framework-specific.

## Boundaries

- `@sdui-kit/core` defines contracts only.
- Framework adapters render nodes and subscribe to store state.
- Query/router packages may have peer dependencies, but core should not.
