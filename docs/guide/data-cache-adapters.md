# Requests, Data & Cache Adapters

Core stays headless by depending on request/cache contracts instead of data libraries. Start with a simple request executor; move to `DataAdapter` or query integrations only when the app needs more structure.

## Level 1: Simple Request Executor

This is the recommended starting point and matches the original `sdui-example` style:

```ts
const actionRunner = new ActionRunner({
  request: ({ endpoint, method, body, params, headers, signal }) => {
    return api.request({
      url: endpoint,
      method,
      data: body,
      params,
      headers,
      signal,
    })
  },
})
```

Request actions should not know whether the app uses `fetch`, Axios, RTK Query, TanStack Query, GraphQL, or mocks.

## Level 2: DataAdapter

Use `DataAdapter` when you want to compose request behavior outside `ActionRunner`:

```ts
const dataAdapter = createRequestAdapter(({ endpoint, method, body, params }) =>
  api.request({ url: endpoint, method, data: body, params }),
)

const actionRunner = new ActionRunner({
  data: dataAdapter,
})
```

You can also implement the shape directly:

```ts
const dataAdapter: DataAdapter = {
  request: (request, context) => api.request(toApiArgs(request, context)),
}
```

## Level 3: CacheAdapter

`CacheAdapter` is optional. It bridges invalidation and refetch behavior when request actions include `invalidate`:

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

If no cache adapter is provided, `invalidate` is ignored and the request still succeeds.

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

It loads `SDUIScreenResponse` from a route, stores the latest response, exposes errors, and supports refresh. It can be in-memory for simple apps, or backed by TanStack Query, RTK Query, Redux, or another store in larger apps.

## Boundaries

- `@sdui-kit/core` defines contracts only.
- Framework adapters render nodes and subscribe to store state.
- Query/cache packages are optional advanced integrations.
- Query/router packages may have peer dependencies, but core should not.
