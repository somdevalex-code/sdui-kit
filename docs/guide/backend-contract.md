# Backend Contract

Backend owns layout, component selection, props, actions, and form rules. Frontend owns actual components, styling, adapters, and security boundaries.

## Node Response

Return a single node or an array of nodes:

```json
{
  "schemaVersion": "1.0",
  "componentName": "Page",
  "props": {
    "children": [
      {
        "componentName": "Text",
        "props": {
          "children": "Applications"
        }
      }
    ]
  }
}
```

For remote navigation, return a `SDUIScreenResponse` that wraps the node with screen-level data and cache metadata:

```json
{
  "schemaVersion": "1.0",
  "node": {
    "componentName": "Page",
    "props": {
      "children": "Applications"
    }
  },
  "data": {
    "total": 24
  },
  "cache": {
    "key": "screen:/applications",
    "ttlMs": 30000,
    "tags": [{ "type": "ApplicationList" }]
  }
}
```

## Contract Checklist

- `schemaVersion` is required for remote screens.
- `componentName` must match a registered frontend key.
- `props` must be JSON-compatible.
- `props.children` may be text, one node, or an array of nodes.
- `props.action` is reserved for SDUI actions and is mapped by adapters.
- Navigation actions should send route intent (`to`, `query`, `replace`, `state`), not router-library fields.
- Mutation actions should include cache tags when related screens need invalidation.
- Do not send functions, raw HTML, secrets, or user-controlled component names without validation.

## Versioning

Use additive changes for minor updates. Change `schemaVersion` when removing fields, changing action semantics, or renaming component names.

## Validation

Validate remote payloads before rendering:

```ts
const result = validateSDUINode(payload)

if (!result.valid) {
  reportPayloadError(result.issues)
}
```
