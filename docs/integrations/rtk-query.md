# RTK Query Integration Pattern

RTK Query can power SDUI requests and invalidation, but it should stay outside core. Treat it as an app-level `DataAdapter` and `CacheAdapter` implementation.

## DataAdapter

For predefined endpoints, dispatch the matching RTK Query endpoint:

```ts
const dataAdapter: DataAdapter = {
  request: async (request) => {
    if (request.endpoint === '/applications' && request.method === 'POST') {
      const result = await store.dispatch(
        api.endpoints.createApplication.initiate(request.body),
      )

      if ('error' in result) throw result.error
      return result.data
    }

    return baseRequest(request)
  },
}
```

Use a fallback `baseRequest` only for endpoints your app allows. Do not execute arbitrary backend-provided URLs without validation.

## CacheAdapter

Map SDUI tags to RTK Query tags:

```ts
const cacheAdapter: CacheAdapter = {
  invalidate: (tags) => {
    store.dispatch(
      api.util.invalidateTags(
        tags.map((tag) =>
          typeof tag === 'string' ? tag : { type: tag.type, id: tag.id },
        ),
      ),
    )
  },
}
```

## ScreenStore

You can back `ScreenStore` with Redux state, RTK Query screen endpoints, or a small local store. The public SDUI shape remains the same: `loading`, `success`, `error`, `refreshing`, and the latest `SDUIScreenResponse`.

## Boundaries

- Core never imports Redux Toolkit.
- Backend payloads use SDUI actions and cache tags, not RTK Query endpoint names.
- The app controls which endpoints are allowed and how errors map back to forms or screens.
