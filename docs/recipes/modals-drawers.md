# Modals & Drawers

Modal and drawer actions are adapter-driven. Core only describes intent.

## Open Modal With SDUI Content

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
            "variant": "h2",
            "children": "Application details"
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

## Modal Form Flow

`openModal` can carry SDUI content. The form inside the modal submits a request, then closes the modal and shows a toast on success.

```json
{
  "type": "openModal",
  "centered": true,
  "children": {
    "componentName": "form",
    "props": {
      "definition": {
        "id": "inviteReviewer",
        "initialValues": {
          "email": ""
        },
        "fields": [
          {
            "name": "email",
            "validation": {
              "required": "Email is required",
              "pattern": {
                "value": "^[^@]+@[^@]+\\.[^@]+$",
                "message": "Enter a valid email"
              }
            }
          }
        ],
        "onSubmit": {
          "type": "request",
          "endpoint": "/api/applications/42/reviewers",
          "method": "POST",
          "body": {
            "email": { "$from": "form.values.email" }
          },
          "invalidate": [{ "type": "Application", "id": "42" }],
          "success": {
            "type": "sequence",
            "actions": [
              {
                "type": "closeModal"
              },
              {
                "type": "toast",
                "message": "Reviewer invited",
                "status": "success"
              },
              {
                "type": "refreshScreen"
              }
            ]
          },
          "error": {
            "type": "toast",
            "message": "Reviewer could not be invited",
            "status": "error"
          }
        }
      },
      "children": [
        {
          "componentName": "textField",
          "props": {
            "name": "email",
            "label": "Reviewer email"
          }
        },
        {
          "componentName": "Button",
          "props": {
            "children": "Invite",
            "type": "submit"
          }
        }
      ]
    }
  }
}
```

## Open Filters Drawer

```json
{
  "type": "drawerOpen",
  "drawerId": "applicationFilters",
  "payload": {
    "status": "active"
  }
}
```

`drawerOpen` identifies an app-owned drawer. The drawer adapter decides which component tree to show for `applicationFilters` and can use `payload` as initial state.

## Apply Filters From Drawer

The action inside the drawer can save filter state, close the drawer, and refresh the current screen:

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
  },
  "error": {
    "type": "toast",
    "message": "Filters could not be applied",
    "status": "error"
  }
}
```

The app adapter decides which modal or drawer system to use. Core only calls `ModalAdapter.open`, `ModalAdapter.close`, `DrawerAdapter.open`, and `DrawerAdapter.close`.

See [Adapters](../guide/adapters.md) for where these actions land in application code.
