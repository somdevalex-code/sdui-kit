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

## Open Drawer

```json
{
  "type": "drawerOpen",
  "drawerId": "applicationFilters",
  "payload": {
    "status": "active"
  }
}
```

The app adapter decides which modal or drawer system to use.
