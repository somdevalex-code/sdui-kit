# Actions

Actions describe runtime intent. The backend says what should happen, `ActionRunner` decides when and in what order to run it, and app-owned adapters perform side effects such as network requests, navigation, toasts, modals, drawers, cache invalidation, and screen refreshes.

Core does not import a router, data library, toast package, modal package, or UI framework.

## Runtime Model

- An action is JSON-compatible intent.
- `ActionRunner` evaluates `when`, asks for `confirm`, resolves request values, runs `sequence` actions in order, and routes built-ins to adapters.
- Adapters are the app boundary. They decide how to call HTTP clients, routers, cache libraries, notification systems, modal systems, and drawer systems.

## Submit, Invalidate, Refresh, Navigate

Use `request` for the mutation and put follow-up UI in `success`. Cache invalidation runs after the request resolves and before the success action runs.

```json
{
  "type": "request",
  "endpoint": "/api/applications",
  "method": "POST",
  "body": {
    "application": { "$from": "form.values" }
  },
  "invalidate": ["ApplicationList"],
  "success": {
    "type": "sequence",
    "actions": [
      {
        "type": "toast",
        "message": "Application submitted",
        "status": "success"
      },
      {
        "type": "refreshScreen"
      },
      {
        "type": "navigate",
        "to": "/applications"
      }
    ]
  }
}
```

`sequence` is not fire-and-forget. The runner awaits each action before starting the next one. If a request, cache adapter, modal adapter, drawer adapter, navigation adapter, or screen refresh returns a promise, the next action waits for it.

If an action in a sequence throws, later sequence actions are not run. For request-specific recovery, use `error`.

## Delete With Confirm

`confirm` is a guard on any action. When a confirm adapter exists, it must return `true` before the guarded action runs. Without a confirm adapter, the action runs.

```json
{
  "type": "request",
  "endpoint": "/api/applications/123",
  "method": "DELETE",
  "confirm": {
    "title": "Delete application?",
    "description": "This cannot be undone.",
    "confirmText": "Delete",
    "cancelText": "Cancel"
  },
  "invalidate": [
    "ApplicationList",
    { "type": "Application", "id": "123" }
  ],
  "success": {
    "type": "sequence",
    "actions": [
      {
        "type": "toast",
        "message": "Application deleted",
        "status": "success"
      },
      {
        "type": "navigate",
        "to": "/applications",
        "replace": true
      }
    ]
  },
  "error": {
    "type": "toast",
    "message": "Application could not be deleted",
    "status": "error"
  }
}
```

## Request Success And Error Branches

`success` runs with `response` in runtime context. `error` runs with `error` in runtime context, then the original request error is rethrown so form stores, buttons, or other callers can still react to failure.

```json
{
  "type": "request",
  "endpoint": "/api/applications/123/review",
  "method": "POST",
  "body": {
    "decision": { "$from": "form.values.decision" },
    "notes": { "$from": "form.values.notes" }
  },
  "success": {
    "type": "toast",
    "message": "Review saved",
    "status": "success"
  },
  "error": {
    "type": "toast",
    "message": "Review could not be saved",
    "status": "error"
  }
}
```

## Conditional Actions

Use `when` to skip an action when runtime context does not match a JSON expression.

```json
{
  "type": "request",
  "when": {
    "and": [
      { "eq": [{ "var": "form.isValid" }, true] },
      { "not": { "var": "form.isSubmitting" } }
    ]
  },
  "endpoint": "/api/applications/draft",
  "method": "PATCH",
  "body": { "$from": "form.values" }
}
```

## Modal And Drawer Close Intents

`closeModal` and `drawerClose` exist so SDUI content can close an app-owned overlay without knowing the UI library that created it.

For example, a backend can open a modal with SDUI content. A button inside that content can close the same modal by emitting intent:

```json
{
  "type": "openModal",
  "centered": true,
  "children": {
    "componentName": "Stack",
    "props": {
      "gap": 12,
      "children": [
        {
          "componentName": "Text",
          "props": {
            "children": "Application submitted"
          }
        },
        {
          "componentName": "Button",
          "props": {
            "children": "Close",
            "action": { "type": "closeModal" }
          }
        }
      ]
    }
  }
}
```

Drawers use the same model. One action can open the drawer:

```json
{
  "type": "drawerOpen",
  "drawerId": "applicationFilters",
  "payload": {
    "status": "active"
  }
}
```

Another action inside the drawer can save state, close the drawer, and refresh the current screen:

```json
{
  "type": "request",
  "endpoint": "/api/application-filters",
  "method": "POST",
  "body": {
    "filters": { "$from": "form.values" }
  },
  "success": {
    "type": "sequence",
    "actions": [
      {
        "type": "drawerClose",
        "drawerId": "applicationFilters"
      },
      {
        "type": "refreshScreen"
      }
    ]
  }
}
```

The app decides whether `closeModal` closes the top modal, a named modal in its own state, or a modal controlled by a third-party component. Core only calls `ModalAdapter.close`. The same boundary applies to `DrawerAdapter.close`.

## Custom Action Handoff

Use custom actions when the backend needs to describe an app-specific intent that does not belong in core.

```json
{
  "type": "analytics.track",
  "event": "application_submitted",
  "metadata": {
    "source": "sdui"
  }
}
```

The app handles it through `ActionRunner`:

```ts
const actionRunner = new ActionRunner({
  custom: {
    'analytics.track': (action) => {
      analytics.track(String(action.event), action.metadata)
    },
  },
})
```

## Built-In Actions

Supported built-ins:

- `request`
- `sequence`
- `toast`
- `navigate`
- `goBack`
- `refreshScreen`
- `openModal`
- `closeModal`
- `drawerOpen`
- `drawerClose`

Navigation, requests and invalidation are delegated to adapters:

- `navigate` and `goBack` use `NavigationAdapter`.
- `request` uses a simple `request` executor or `DataAdapter`.
- `request.invalidate` uses `CacheAdapter` when one is provided.
- `refreshScreen` refreshes the current `ScreenStore`.
- `openModal` and `closeModal` use `ModalAdapter`.
- `drawerOpen` and `drawerClose` use `DrawerAdapter`.

Legacy aliases from the original example are supported for migration: `REQUEST`, `UI_ONLY` and `uiSequence`.

Custom actions are handled through `new ActionRunner({ custom: { actionType() {} } })`.

For complete examples, see [Action Flows](../recipes/actions.md) and [Modals & Drawers](../recipes/modals-drawers.md).
