# Action Flows

Actions can be attached to any component through `props.action`.

## Button With Toast

```json
{
  "componentName": "Button",
  "props": {
    "children": "Save",
    "action": {
      "type": "toast",
      "message": "Saved",
      "status": "success"
    }
  }
}
```

## Request Then Navigate

```json
{
  "componentName": "Button",
  "props": {
    "children": "Submit",
    "action": {
      "type": "request",
      "endpoint": "/api/applications",
      "method": "POST",
      "body": { "$from": "form.values" },
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
            "type": "navigate",
            "to": "/applications"
          }
        ]
      },
      "error": {
        "type": "toast",
        "message": "Application could not be submitted",
        "status": "error"
      }
    }
  }
}
```

## Confirm Before Delete

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

## Save Draft After A Field Changes

```json
{
  "componentName": "Button",
  "props": {
    "children": "Save draft",
    "action": {
      "type": "request",
      "when": {
        "eq": [{ "var": "form.touched.title" }, true]
      },
      "endpoint": "/api/applications/draft",
      "method": "PATCH",
      "body": { "$from": "form.values" },
      "success": {
        "type": "toast",
        "message": "Draft saved",
        "status": "success"
      }
    }
  }
}
```

## Custom Analytics Handoff

```json
{
  "componentName": "Button",
  "props": {
    "children": "Start review",
    "action": {
      "type": "sequence",
      "actions": [
        {
          "type": "analytics.track",
          "event": "review_started",
          "metadata": {
            "source": "applicationDetails"
          }
        },
        {
          "type": "navigate",
          "to": "/applications/123/review"
        }
      ]
    }
  }
}
```

The app handles `analytics.track` through `ActionRunner({ custom })`; core only routes the action by `type`.

For overlay-specific flows, see [Modals & Drawers](./modals-drawers.md).
