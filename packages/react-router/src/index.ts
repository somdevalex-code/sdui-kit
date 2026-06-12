import {
  NavigateAction,
  NavigationAdapter,
  RuntimeContext,
} from '@sdui-kit/core'

export type ReactRouterNavigate = (
  to: string | number,
  options?: {
    replace?: boolean
    state?: unknown
  },
) => void

export interface ReactRouterNavigationAdapterOptions {
  navigate: ReactRouterNavigate
}

export function createReactRouterNavigationAdapter(
  options: ReactRouterNavigationAdapterOptions,
): NavigationAdapter<NavigateAction> {
  return {
    navigate: (action, _context: RuntimeContext) => {
      options.navigate(withQuery(action.to, action.query), {
        replace: action.replace,
        state: action.state,
      })
    },
    goBack: () => {
      options.navigate(-1)
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
