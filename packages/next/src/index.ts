import {
  NavigateAction,
  NavigationAdapter,
  RouteContext,
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

export type NextRouteParamValue =
  | string
  | string[]
  | number
  | boolean
  | null
  | undefined

export type NextSearchParamsLike =
  | URLSearchParams
  | {
      forEach(callback: (value: string, key: string) => void): void
    }
  | Record<string, NextRouteParamValue>

export interface NextRouteContextOptions {
  pathname: string
  params?: Record<string, NextRouteParamValue>
  searchParams?: NextSearchParamsLike
  screenId?: string
  state?: unknown
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

export function createNextRouteContext(
  options: NextRouteContextOptions,
): RouteContext {
  return compactRoute({
    path: options.pathname || '/',
    screenId: options.screenId,
    params: normalizeParams(options.params),
    query: normalizeSearchParams(options.searchParams),
    state: normalizeState(options.state),
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

function normalizeSearchParams(
  searchParams?: NextSearchParamsLike,
): Record<string, string> | undefined {
  if (!searchParams) {
    return undefined
  }

  if (hasSearchParamsForEach(searchParams)) {
    const query: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      query[key] = value
    })
    return Object.keys(query).length > 0 ? query : undefined
  }

  return normalizeSearchRecord(searchParams)
}

function hasSearchParamsForEach(
  value: NextSearchParamsLike,
): value is URLSearchParams | {
  forEach(callback: (value: string, key: string) => void): void
} {
  return typeof (value as { forEach?: unknown }).forEach === 'function'
}

function normalizeParams(
  params?: Record<string, NextRouteParamValue>,
): Record<string, string> | undefined {
  if (!params) {
    return undefined
  }

  const normalized: Record<string, string> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) {
      return
    }

    normalized[key] = Array.isArray(value) ? value.join('/') : String(value)
  })

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function normalizeSearchRecord(
  searchParams: Record<string, NextRouteParamValue>,
): Record<string, string> | undefined {
  const normalized: Record<string, string> = {}

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value == null) {
      return
    }

    if (Array.isArray(value)) {
      const last = value[value.length - 1]

      if (last !== undefined) {
        normalized[key] = last
      }
      return
    }

    normalized[key] = String(value)
  })

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function compactRoute(route: RouteContext): RouteContext {
  return {
    path: route.path,
    ...(route.screenId ? { screenId: route.screenId } : {}),
    ...(route.params ? { params: route.params } : {}),
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
