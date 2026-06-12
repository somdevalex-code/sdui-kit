import {
  NavigateAction,
  NavigationAdapter,
  RuntimeContext,
} from '@sdui-kit/core'

export interface NextRouterLike {
  push(href: string, options?: { scroll?: boolean }): void
  replace(href: string, options?: { scroll?: boolean }): void
  back(): void
}

export interface NextNavigationAdapterOptions {
  router: NextRouterLike
  scroll?: boolean
  onNavigate?: (href: string, action: NavigateAction) => void
}

export function createNextNavigationAdapter(
  options: NextNavigationAdapterOptions,
): NavigationAdapter<NavigateAction> {
  return {
    navigate: (action, _context: RuntimeContext) => {
      const href = withQuery(action.to, action.query)
      const routerOptions = { scroll: options.scroll }

      if (action.replace) {
        options.router.replace(href, routerOptions)
      } else {
        options.router.push(href, routerOptions)
      }

      options.onNavigate?.(href, action)
    },
    goBack: () => {
      options.router.back()
    },
  }
}

export function withQuery(
  to: string,
  query?: Record<string, unknown>,
): string {
  if (!query || Object.keys(query).length === 0) {
    return to
  }

  const url = new URL(to, 'http://sdui.local')

  Object.entries(query).forEach(([key, value]) => {
    if (value == null) {
      return
    }

    url.searchParams.set(key, String(value))
  })

  return `${url.pathname}${url.search}${url.hash}`
}
