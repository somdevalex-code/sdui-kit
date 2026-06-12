# SDUI Kit

SDUI Kit is a framework-agnostic runtime for Server-Driven UI.

Use the core package to define the JSON protocol, actions and expressions. Use a framework adapter, such as `@sdui-kit/react`, to render the payload with your own components.

```bash
pnpm add @sdui-kit/core @sdui-kit/react
```

Start with [Getting Started](./guide/getting-started.md).

## Common Paths

- Learn the payload shape in [Protocol](./guide/protocol.md).
- Register app components with [Component Registry](./guide/registry.md).
- Agree with backend on [Backend Contract](./guide/backend-contract.md).
- Load remote screens with [Navigation & Screens](./guide/navigation-screens.md).
- Connect stores and query clients with [Data & Cache Adapters](./guide/data-cache-adapters.md).
- Wire router/query libraries through [Integrations](./integrations/tanstack-query.md).
- Build real screens with [Layouts & Cards](./recipes/layouts.md).
- Add form workflows with [Dynamic Forms](./recipes/forms.md).
- Run the reference app in [React Basic](./examples/react-basic.md).
