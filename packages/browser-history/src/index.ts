import {
  NavigateAction,
  NavigationAdapter,
  RouteContext,
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

export interface BrowserHistoryLocationLike {
  pathname: string
  search?: string
}

export interface BrowserHistoryRouteContextOptions {
  url?: string | URL
  location?: BrowserHistoryLocationLike
  baseUrl?: string
  state?: unknown
  screenId?: string
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

export function createBrowserHistoryRouteContext(
  options: BrowserHistoryRouteContextOptions = {},
): RouteContext {
  const url = resolveUrl(options)
  const state = 'state' in options ? options.state : readBrowserHistoryState()

  return compactRoute({
    path: url.pathname || '/',
    screenId: options.screenId,
    query: searchToQuery(url.search),
    state: normalizeState(state),
  })
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

function resolveUrl(options: BrowserHistoryRouteContextOptions): URL {
  if (options.url) {
    return new URL(options.url, options.baseUrl ?? getBrowserBaseUrl())
  }

  if (options.location) {
    return new URL(
      `${options.location.pathname}${options.location.search ?? ''}`,
      options.baseUrl ?? getBrowserBaseUrl(),
    )
  }

  if (typeof window !== 'undefined') {
    return new URL(window.location.href)
  }

  return new URL('/', options.baseUrl ?? 'http://sdui.local')
}

function getBrowserBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return 'http://sdui.local'
}

function readBrowserHistoryState(): Record<string, unknown> | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const state = window.history.state
  return normalizeState(state)
}

function searchToQuery(search?: string): Record<string, string> | undefined {
  if (!search) {
    return undefined
  }

  const query = Object.fromEntries(new URLSearchParams(search).entries())
  return Object.keys(query).length > 0 ? query : undefined
}

function compactRoute(route: RouteContext): RouteContext {
  return {
    path: route.path,
    ...(route.screenId ? { screenId: route.screenId } : {}),
    ...(route.query ? { query: route.query } : {}),
    ...(route.state ? { state: route.state } : {}),
  }
}

function normalizeState(state: unknown): Record<string, unknown> | undefined {
  return isRecord(state) ? state : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
