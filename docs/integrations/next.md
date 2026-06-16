# Next App Router Integration

Next App Router should be connected through a `NavigationAdapter`. Neither `@sdui-kit/core` nor `@sdui-kit/react` should import `next/navigation`.

## Install

```bash
pnpm add @sdui-kit/core @sdui-kit/react @sdui-kit/next
```

`@sdui-kit/next` expects Next to be installed by the host app.

## Navigation Adapter

Create the adapter inside a client component that can access Next hooks:

```tsx
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ActionRunner } from '@sdui-kit/core'
import {
  createNextNavigationAdapter,
  createNextRouteContext,
} from '@sdui-kit/next'

function SDUIRouteBoundary() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navigation = createNextNavigationAdapter({ router })
  const route = createNextRouteContext({
    pathname,
    searchParams,
  })

  const actionRunner = new ActionRunner({
    navigation,
    screen: screenStore,
    request: apiRequest,
  })

  useEffect(() => {
    void screenStore.setRoute(route)
  }, [pathname, searchParams])

  return (
    <SDUIScreenProvider
      registry={registry}
      actionRunner={actionRunner}
      screenStore={screenStore}
    >
      <SDUIScreenRenderer />
    </SDUIScreenProvider>
  )
}
```

## Notes

- Use `app/[[...slug]]/page.tsx` or an equivalent route segment as the SDUI catch-all boundary.
- Next App Router does not support arbitrary browser history state in the same way React Router does; keep SDUI `state` usage optional.
- Build query strings in the adapter and keep backend payloads framework-neutral.
- Use server routes or API handlers to return `SDUIScreenResponse`.
