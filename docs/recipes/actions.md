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
  "success": {
    "type": "toast",
    "message": "Application deleted",
    "status": "success"
  }
}
```
