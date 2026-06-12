# Actions

Actions describe behavior. Core knows how to orchestrate them, while adapters perform app-specific effects.

```json
{
  "type": "sequence",
  "actions": [
    {
      "type": "request",
      "endpoint": "/api/applications",
      "method": "POST",
      "body": { "$from": "form.values" }
    },
    {
      "type": "toast",
      "message": "Application submitted",
      "status": "success"
    },
    {
      "type": "navigate",
      "to": "/applications"
    }
  ]
}
```

Supported built-ins:

- `request`
- `sequence`
- `toast`
- `navigate`
- `goBack`
- `refreshScreen`
- `invalidate`
- `openModal`
- `closeModal`
- `drawerOpen`
- `drawerClose`

Navigation, requests and invalidation are delegated to adapters:

- `navigate` and `goBack` use `NavigationAdapter`.
- `request` uses `DataAdapter`.
- `invalidate` uses `CacheAdapter`.
- `refreshScreen` refreshes the current `ScreenStore`.

Legacy aliases from the original example are supported for migration: `REQUEST`, `UI_ONLY` and `uiSequence`.

Custom actions are handled through `new ActionRunner({ custom: { actionType() {} } })`.
