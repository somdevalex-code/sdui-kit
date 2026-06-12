# TanStack Query Integration

TanStack Query is a good fit for SDUI screen loading because query keys, cancellation, refetch, and invalidation map cleanly to `ScreenStore`, `DataAdapter`, and `CacheAdapter`.

## Adapter Shape

Keep TanStack imports in the app or `@sdui-kit/tanstack-query`, not in core:

```ts
const dataAdapter: DataAdapter = {
  request: ({ endpoint, method, body, params, signal }) =>
    api.request({ url: endpoint, method, data: body, params, signal }),
}

const cacheAdapter: CacheAdapter = {
  get: (key) => queryClient.getQueryData([key]),
  set: (key, value) => queryClient.setQueryData([key], value),
  invalidate: (tags) =>
    queryClient.invalidateQueries({
      predicate: (query) => matchesSDUITag(query.queryKey, tags),
    }),
}
```

## Screen Queries

Build screen query keys from route context:

```ts
const screenKey = ['sdui-screen', route.path, route.params, route.query]

const screen = useQuery({
  queryKey: screenKey,
  queryFn: ({ signal }) => fetchScreen({ route, signal }),
})
```

The query function returns `SDUIScreenResponse`. Pass the resulting state into `ScreenStore` or expose it through a TanStack-backed `ScreenStore` implementation.

## Invalidation

Backend can attach cache tags to screens and mutations:

```json
{
  "cache": {
    "tags": [{ "type": "Application", "id": "42" }]
  }
}
```

After a mutation, `ActionRunner` calls `CacheAdapter.invalidate(tags)`. The TanStack adapter decides how SDUI tags map to query keys.

## Notes

- Pass `AbortSignal` through query functions.
- Keep query keys deterministic.
- Do not expose TanStack-specific fields in backend payloads.
