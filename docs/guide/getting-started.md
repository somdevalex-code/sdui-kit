# Getting Started

Install the core runtime and one UI adapter:

```bash
pnpm add @sdui-kit/core @sdui-kit/react
```

Register components from your application:

```tsx
import { ActionRunner } from '@sdui-kit/core'
import { SDUIProvider, SDUIRenderer, createReactRegistry } from '@sdui-kit/react'

const registry = createReactRegistry({
  text: Text,
  button: Button,
})

const actionRunner = new ActionRunner({
  request: ({ endpoint, method, body, params }) =>
    api.request({ url: endpoint, method, data: body, params }),
  toast: (action) => console.log(action.message),
})
```

Render a backend payload:

```tsx
const screen = {
  schemaVersion: '1.0',
  componentName: 'button',
  props: {
    children: 'Save',
    action: {
      type: 'request',
      endpoint: '/api/save',
      method: 'POST',
      body: { id: '123' },
      success: {
        type: 'toast',
        message: 'Saved',
        status: 'success',
      },
    },
  },
}

export function App() {
  return (
    <SDUIProvider registry={registry} actionRunner={actionRunner}>
      <SDUIRenderer node={screen} />
    </SDUIProvider>
  )
}
```

The package does not ship a design system. The consuming app owns visual components, styling, router, API client, modals and notifications.

The registry is intentionally just a component map. Use direct components when backend props match component props:

```tsx
const registry = createReactRegistry({
  Text,
  Button,
  SummaryCard,
})
```

The SDUI payload uses those keys as `componentName`. Matching is case-sensitive:

```json
{
  "componentName": "SummaryCard",
  "props": {
    "title": "Applications",
    "value": "24"
  }
}
```

Use wrappers only when the SDUI payload needs adaptation:

```tsx
const registry = createReactRegistry({
  badge: ({ label, ...props }) => <Badge {...props}>{label}</Badge>,
})
```
