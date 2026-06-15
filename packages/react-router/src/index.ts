import {
  NavigateAction,
  NavigationAdapter,
  RouteContext,
  RuntimeContext,
  SDUIRouteDefinition,
  SDUIRouteManifest,
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

export interface ReactRouterLocationLike {
  pathname: string
  search?: string
  state?: unknown
}

export interface ReactRouterRouteContextOptions {
  location: ReactRouterLocationLike
  params?: Record<string, string | undefined>
  screenId?: string
}

export interface ReactRouterRouteObjectLike {
  id?: string
  path?: string
  element?: unknown
  loader?: unknown
  action?: unknown
  errorElement?: unknown
  handle?: Record<string, unknown>
  children?: ReactRouterRouteObjectLike[]
}

export interface ReactRouterCatchAllRouteOptions {
  id?: string
  path?: string
  element: unknown
  loader?: unknown
  action?: unknown
  errorElement?: unknown
  handle?: Record<string, unknown>
}

export interface ReactRouterManifestRouteOptions {
  element?: unknown
  elementForRoute?: (route: SDUIRouteDefinition) => unknown
  handle?: (route: SDUIRouteDefinition) => Record<string, unknown>
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

export function createReactRouterRouteContext(
  options: ReactRouterRouteContextOptions,
): RouteContext {
  return compactRoute({
    path: options.location.pathname || '/',
    screenId: options.screenId,
    params: normalizeParams(options.params),
    query: searchToQuery(options.location.search),
    state: normalizeState(options.location.state),
  })
}

export function createReactRouterCatchAllRoute(
  options: ReactRouterCatchAllRouteOptions,
): ReactRouterRouteObjectLike {
  return compactRouteObject({
    id: options.id,
    path: options.path ?? '*',
    element: options.element,
    loader: options.loader,
    action: options.action,
    errorElement: options.errorElement,
    handle: options.handle,
  })
}

export function createReactRouterRoutesFromManifest(
  manifest: SDUIRouteManifest,
  options: ReactRouterManifestRouteOptions = {},
): ReactRouterRouteObjectLike[] {
  return manifest.routes.map((route) =>
    createReactRouterRouteFromDefinition(route, options),
  )
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

function createReactRouterRouteFromDefinition(
  route: SDUIRouteDefinition,
  options: ReactRouterManifestRouteOptions,
): ReactRouterRouteObjectLike {
  const element = options.elementForRoute?.(route) ?? options.element
  const handle = {
    routeId: route.id,
    screenId: route.screenId,
    title: route.title,
    metadata: route.metadata,
    sduiRoute: route,
    ...options.handle?.(route),
  }

  return compactRouteObject({
    id: route.id,
    path: route.path,
    element,
    handle,
    children: route.children?.map((child) =>
      createReactRouterRouteFromDefinition(child, options),
    ),
  })
}

function searchToQuery(search?: string): Record<string, string> | undefined {
  if (!search) {
    return undefined
  }

  const query = Object.fromEntries(new URLSearchParams(search).entries())
  return Object.keys(query).length > 0 ? query : undefined
}

function normalizeParams(
  params?: Record<string, string | undefined>,
): Record<string, string> | undefined {
  if (!params) {
    return undefined
  }

  const normalized = Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string] => {
      return entry[1] !== undefined
    }),
  )

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

function compactRouteObject(
  route: ReactRouterRouteObjectLike,
): ReactRouterRouteObjectLike {
  return Object.fromEntries(
    Object.entries(route).filter((entry) => entry[1] !== undefined),
  ) as ReactRouterRouteObjectLike
}
