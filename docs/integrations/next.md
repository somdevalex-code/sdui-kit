# Next App Router Integration

Next App Router should be connected through a `NavigationAdapter`. Neither `@sdui-kit/core` nor `@sdui-kit/react` should import `next/navigation`.

## Navigation Adapter

Create the adapter inside a client component that can access Next hooks:

```tsx
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ActionRunner } from '@sdui-kit/core'
import { createNextNavigationAdapter } from '@sdui-kit/next'

function SDUIRouteBoundary() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navigation = createNextNavigationAdapter({ router })
  const route = {
    path: pathname,
    query: Object.fromEntries(searchParams.entries()),
  }

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

- Next App Router does not support arbitrary browser history state in the same way React Router does; keep SDUI `state` usage optional.
- Build query strings in the adapter and keep backend payloads framework-neutral.
- Use server routes or API handlers to return `SDUIScreenResponse`.
