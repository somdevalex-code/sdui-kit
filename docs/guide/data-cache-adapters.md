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

For local development and tests, this request executor can point at [MSW-backed endpoints](./backend-mocking.md).

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

The usual flow is:

1. A screen response declares the cache key and tags for the data it rendered.
2. A later mutation action invalidates matching tags.
3. The app cache adapter maps those tags to its own cache, query, or store invalidation.
4. The action can also run `refreshScreen` when the current SDUI screen should reload immediately.

Screen response:

```json
{
  "schemaVersion": "1.0",
  "node": {
    "componentName": "ApplicationDetails",
    "props": {
      "title": "Application #42"
    }
  },
  "cache": {
    "key": "screen:/applications/42",
    "ttlMs": 30000,
    "tags": [
      { "type": "Application", "id": "42" },
      "ApplicationList"
    ]
  }
}
```

Mutation action:

```json
{
  "type": "request",
  "endpoint": "/api/applications/42",
  "method": "PATCH",
  "body": {
    "application": { "$from": "form.values" }
  },
  "invalidate": [
    { "type": "Application", "id": "42" },
    "ApplicationList"
  ],
  "success": {
    "type": "refreshScreen"
  }
}
```

`ActionRunner` normalizes `invalidate` into cache tags and calls `CacheAdapter.invalidate(tags, context)` when a cache adapter is provided. The adapter decides whether that means clearing an in-memory entry, invalidating TanStack Query keys, dispatching RTK Query invalidations, or doing nothing.

If `CacheAdapter.invalidate` rejects, the request action rejects through the normal `ActionRunner.run(...)` flow and `onError`. The request `error` branch is reserved for failures from the mutation request executor or `DataAdapter.request`.

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
