# React Router Integration

React Router should be connected through a `NavigationAdapter`. The React SDUI package should not import `react-router-dom` directly.

## NavigationAdapter

Create the adapter inside a component that can access React Router hooks:

```tsx
function SDUIRouteBoundary() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const navigationAdapter: NavigationAdapter = {
    navigate: (action) => {
      const to = {
        pathname: action.to,
        search: new URLSearchParams(action.query).toString(),
      }

      navigate(to, {
        replace: action.replace,
        state: action.state,
      })
    },
    goBack: () => navigate(-1),
  }

  const route = {
    path: location.pathname,
    params,
    query: Object.fromEntries(new URLSearchParams(location.search)),
    state: location.state,
  }

  return (
    <SDUIScreenProvider
      registry={registry}
      actionRunner={actionRunner}
      screenStore={screenStore}
    >
      <SDUIScreenRenderer />
    </SDUIScreenProvider>
  )
}
```

## Route Changes

Pass `navigationAdapter` into `ActionRunner`, not `SDUIScreenProvider`:

```ts
const actionRunner = new ActionRunner({
  navigation: navigationAdapter,
  screen: screenStore,
  request: apiRequest,
})
```

When React Router updates `location`, call `screenStore.setRoute(route)` from an effect so the matching `SDUIScreenResponse` loads.

## Backend Payload

Navigation remains framework-neutral:

```json
{
  "type": "navigate",
  "to": "/applications/42",
  "query": { "tab": "documents" },
  "state": { "from": "list" }
}
```

Only the adapter knows this becomes `navigate(...)`.
