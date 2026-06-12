import {
  NavigateAction,
  NavigationAdapter,
  RuntimeContext,
} from '@sdui-kit/core'

export interface HistoryLike {
  pushState(data: unknown, unused: string, url?: string | URL | null): void
  replaceState(data: unknown, unused: string, url?: string | URL | null): void
  back(): void
}

export interface BrowserHistoryNavigationAdapterOptions {
  history?: HistoryLike
  onChange?: (url: string, action: NavigateAction) => void
}

export function createBrowserHistoryNavigationAdapter(
  options: BrowserHistoryNavigationAdapterOptions = {},
): NavigationAdapter<NavigateAction> {
  const getHistory = () => {
    if (options.history) {
      return options.history
    }

    if (typeof window === 'undefined') {
      throw new Error('Browser history adapter requires a history object')
    }

    return window.history
  }

  return {
    navigate: (action, _context: RuntimeContext) => {
      const url = withQuery(action.to, action.query)
      const history = getHistory()

      if (action.replace) {
        history.replaceState(action.state ?? null, '', url)
      } else {
        history.pushState(action.state ?? null, '', url)
      }

      options.onChange?.(url, action)
    },
    goBack: () => {
      getHistory().back()
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
