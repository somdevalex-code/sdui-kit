# Layouts & Cards

Use small layout primitives in the registry and let backend compose them.

## Dashboard Section

```json
{
  "componentName": "Stack",
  "props": {
    "gap": 16,
    "children": [
      {
        "componentName": "Text",
        "props": {
          "variant": "h1",
          "children": "Applications"
        }
      },
      {
        "componentName": "Grid",
        "props": {
          "columns": 3,
          "children": [
            {
              "componentName": "SummaryCard",
              "props": {
                "title": "Active",
                "value": "24",
                "tone": "info"
              }
            },
            {
              "componentName": "SummaryCard",
              "props": {
                "title": "Approved",
                "value": "156",
                "tone": "success"
              }
            }
          ]
        }
      }
    ]
  }
}
```

## Clickable Card

```json
{
  "componentName": "ActionCard",
  "props": {
    "title": "Open applications",
    "description": "Review current requests",
    "action": {
      "type": "navigate",
      "to": "/applications",
      "query": {
        "status": "active"
      }
    }
  }
}
```

The frontend decides how `Stack`, `Grid`, and `ActionCard` look. Backend only controls composition and data.
