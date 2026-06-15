# SDUI Kit

SDUI Kit is a framework-agnostic runtime for Server-Driven UI.

Use the core package to define the JSON protocol, actions and expressions. Choose a framework adapter to render the payload with your own components.

::: code-group

```bash [React]
pnpm add @sdui-kit/core @sdui-kit/react
```

```bash [Vue]
pnpm add @sdui-kit/core @sdui-kit/vue
```

:::

Use the framework selector in the top navigation for adapter-specific setup.

::: code-group

```ts [React]
import { SDUIProvider, SDUIRenderer, createReactRegistry } from '@sdui-kit/react'
```

```ts [Vue]
import { SDUIProvider, SDUIRenderer, createVueRegistry } from '@sdui-kit/vue'
```

:::

## Common Paths

- Start with the framework-neutral [Getting Started](./guide/getting-started.md).
- Set up [React](./integrations/react.md) or [Vue](./integrations/vue.md).
- Learn the payload shape in [Protocol](./guide/protocol.md).
- Register app components with [Component Registry](./guide/registry.md).
- Agree with backend on [Backend Contract](./guide/backend-contract.md).
- Load remote screens with [Navigation & Screens](./guide/navigation-screens.md).
- Connect stores and query clients with [Data & Cache Adapters](./guide/data-cache-adapters.md).
- Wire router/query libraries through [Integrations](./integrations/tanstack-query.md).
- Build real screens with [Layouts & Cards](./recipes/layouts.md).
- Add form workflows with [Dynamic Forms](./recipes/forms.md).
- Run the reference app in [React Basic](./examples/react-basic.md).
