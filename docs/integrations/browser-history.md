# Browser History Integration

Browser history support belongs in an adapter or app shell. Core should not require browser globals, which keeps it usable in SSR, native, workers, tests, and non-browser runtimes.

## NavigationAdapter

A browser adapter can wrap `history.pushState` and `history.replaceState`:

```ts
const navigationAdapter: NavigationAdapter = {
  navigate: (action) => {
    const url = buildUrl(action.to, action.query)

    if (action.replace) {
      window.history.replaceState(action.state ?? null, '', url)
      return
    }

    window.history.pushState(action.state ?? null, '', url)
  },
  goBack: () => window.history.back(),
}
```

This code should live outside core.

## Route Context

The app shell can parse browser location into SDUI route context:

```ts
function getRouteContext(): RouteContext {
  return {
    path: window.location.pathname,
    query: Object.fromEntries(new URLSearchParams(window.location.search)),
    state: window.history.state ?? undefined,
  }
}
```

Listen to `popstate` and notify `ScreenStore` so back/forward navigation loads the correct screen.

## Refresh

For SDUI, `refreshScreen` should refetch the current `SDUIScreenResponse`. It should not call `window.location.reload()` unless the host app intentionally implements it that way.
