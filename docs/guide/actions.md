# Actions

Actions describe runtime intent. The backend says what should happen, `ActionRunner` decides when and in what order to run it, and app-owned adapters perform side effects such as network requests, navigation, toasts, modals, drawers, cache invalidation, and screen refreshes.

Core does not import a router, data library, toast package, modal package, or UI framework.

## Runtime Model

- An action is JSON-compatible intent.
- `ActionRunner` evaluates `when`, asks for `confirm`, resolves request values, runs `sequence` actions in order, and routes built-ins to adapters.
- Adapters are the app boundary. They decide how to call HTTP clients, routers, cache libraries, notification systems, modal systems, and drawer systems.

## How Actions Are Invoked

Actions only run when something calls `ActionRunner.run(action, context)`.

React and Vue adapters do this automatically for the common clickable case. When a rendered SDUI node has `props.action`, the framework renderer creates an `onClick` handler for the registered component and does not forward the raw `action` prop.

::: code-group

```tsx [React]
const registry = createReactRegistry({
  Button: (props) => <button {...props} />,
})

const node = {
  componentName: 'Button',
  props: {
    children: 'Save',
    action: {
      type: 'toast',
      message: 'Saved',
      status: 'success',
    },
  },
}

function App() {
  return (
    <SDUIProvider registry={registry} actionRunner={actionRunner}>
      <SDUIRenderer node={node} />
    </SDUIProvider>
  )
}
```

```vue [Vue]
<script setup lang="ts">
const registry = createVueRegistry({
  Button: {
    props: ['children'],
    template: '<button><slot />{{ children }}</button>',
  },
})

const node = {
  componentName: 'Button',
  props: {
    children: 'Save',
    action: {
      type: 'toast',
      message: 'Saved',
      status: 'success',
    },
  },
}
</script>

<template>
  <SDUIProvider :registry="registry" :action-runner="actionRunner">
    <SDUIRenderer :node="node" />
  </SDUIProvider>
</template>
```

:::

The registered component must pass the received click handler to an interactive element. If a component ignores `onClick`, the action is configured correctly but nothing will trigger it.

For non-click events or action props with another name, call the runner from framework hooks:

::: code-group

```tsx [React]
import type { SDUIAction } from '@sdui-kit/core'
import { useSDUIAction } from '@sdui-kit/react'

function MenuItem({
  label,
  selectAction,
}: {
  label: string
  selectAction: SDUIAction
}) {
  const runAction = useSDUIAction()

  return <button onClick={() => runAction(selectAction)}>{label}</button>
}
```

```ts [Vue]
import type { SDUIAction } from '@sdui-kit/core'
import { defineComponent, h, type PropType } from 'vue'
import { useSDUIAction } from '@sdui-kit/vue'

const MenuItem = defineComponent({
  props: {
    label: { type: String, required: true },
    selectAction: {
      type: Object as PropType<SDUIAction>,
      required: true,
    },
  },
  setup(props) {
    const runAction = useSDUIAction()

    return () =>
      h('button', { onClick: () => runAction(props.selectAction) }, props.label)
  },
})
```

:::

With vanilla JavaScript, there is no framework renderer wiring. Create an `ActionRunner` and call it from the event listener yourself:

```ts
const actionRunner = new ActionRunner({
  toast: (action) => {
    window.alert(action.message)
  },
  request: ({ endpoint, method, body }) =>
    fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body),
    }),
})

button.addEventListener('click', (event) => {
  void actionRunner.run(
    {
      type: 'sequence',
      actions: [
        {
          type: 'request',
          endpoint: '/api/applications',
          method: 'POST',
          body: { status: 'submitted' },
        },
        {
          type: 'toast',
          message: 'Application submitted',
          status: 'success',
        },
      ],
    },
    { event },
  )
})
```

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

If an action in a sequence throws, later sequence actions are not run. For mutation request failures, use `error`.

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

`success` runs with `response` in runtime context. `error` runs only when the mutation request executor or `DataAdapter.request` rejects. It receives `error` in runtime context, then the original request error is rethrown so form stores, buttons, or other callers can still react to failure.

Failures in cache invalidation or `success` follow-up actions are post-request failures. They reject through the normal `ActionRunner.run(...)` flow and `onError`, but they do not run the request `error` branch.

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
