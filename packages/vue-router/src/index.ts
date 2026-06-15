import {
  type NavigateAction,
  type NavigationAdapter,
  type RouteContext,
  type RuntimeContext,
  type SDUIRouteDefinition,
  type SDUIRouteManifest,
} from '@sdui-kit/core'

export type VueRouterValue =
  | VueRouterScalarValue
  | VueRouterScalarValue[]

export type VueRouterScalarValue =
  | string
  | number
  | boolean
  | null
  | undefined

export interface VueRouterLocationLike {
  path: string
  query?: Record<string, string>
  hash?: string
  state?: Record<string, unknown>
}

export interface VueRouterLike {
  push(location: VueRouterLocationLike): unknown
  replace(location: VueRouterLocationLike): unknown
  back(): unknown
}

export interface VueRouterNavigationAdapterOptions {
  router: VueRouterLike
  onNavigate?: (location: VueRouterLocationLike, action: NavigateAction) => void
}

export interface VueRouteLike {
  path?: string
  fullPath?: string
  params?: Record<string, VueRouterValue>
  query?: Record<string, VueRouterValue>
  state?: unknown
  meta?: Record<string, unknown>
}

export interface VueRouterRouteContextOptions {
  route: VueRouteLike
  screenId?: string
  state?: unknown
}

export interface VueRouterRouteRecordLike {
  path: string
  name?: string
  component?: unknown
  components?: Record<string, unknown>
  redirect?: unknown
  beforeEnter?: unknown
  meta?: Record<string, unknown>
  children?: VueRouterRouteRecordLike[]
}

export interface VueRouterCatchAllRouteOptions {
  name?: string
  path?: string
  component?: unknown
  components?: Record<string, unknown>
  redirect?: unknown
  beforeEnter?: unknown
  meta?: Record<string, unknown>
}

export interface VueRouterManifestRouteOptions {
  component?: unknown
  components?: Record<string, unknown>
  redirect?: unknown
  beforeEnter?: unknown
  componentForRoute?: (route: SDUIRouteDefinition) => unknown
  componentsForRoute?: (
    route: SDUIRouteDefinition,
  ) => Record<string, unknown> | undefined
  redirectForRoute?: (route: SDUIRouteDefinition) => unknown
  beforeEnterForRoute?: (route: SDUIRouteDefinition) => unknown
  meta?: (route: SDUIRouteDefinition) => Record<string, unknown>
}

export function createVueRouterNavigationAdapter(
  options: VueRouterNavigationAdapterOptions,
): NavigationAdapter<NavigateAction> {
  return {
    navigate: async (action, _context: RuntimeContext) => {
      const location = createVueRouterLocation(action)
      const result = action.replace
        ? options.router.replace(location)
        : options.router.push(location)

      options.onNavigate?.(location, action)
      await result
    },
    goBack: () => {
      options.router.back()
    },
  }
}

export function createVueRouterLocation(
  action: NavigateAction,
): VueRouterLocationLike {
  const url = new URL(action.to, 'http://sdui.local')
  const query = normalizeQueryFromSearch(url.searchParams)

  if (action.query) {
    Object.entries(action.query).forEach(([key, value]) => {
      if (value == null) {
        return
      }

      query[key] = String(value)
    })
  }

  return compactLocation({
    path: url.pathname,
    query: Object.keys(query).length > 0 ? query : undefined,
    hash: url.hash || undefined,
    state: normalizeState(action.state),
  })
}

export function createVueRouterRouteContext(
  options: VueRouterRouteContextOptions,
): RouteContext {
  return compactRoute({
    path: options.route.path || pathFromFullPath(options.route.fullPath) || '/',
    screenId: options.screenId,
    params: normalizeParams(options.route.params),
    query: normalizeQueryRecord(options.route.query),
    state: normalizeState(options.state ?? options.route.state),
  })
}

export function createVueRouterCatchAllRoute(
  options: VueRouterCatchAllRouteOptions = {},
): VueRouterRouteRecordLike {
  return compactRouteRecord({
    path: options.path ?? '/:pathMatch(.*)*',
    name: options.name,
    component: options.component,
    components: options.components,
    redirect: options.redirect,
    beforeEnter: options.beforeEnter,
    meta: options.meta,
  })
}

export function createVueRouterRoutesFromManifest(
  manifest: SDUIRouteManifest,
  options: VueRouterManifestRouteOptions = {},
): VueRouterRouteRecordLike[] {
  return manifest.routes.map((route) =>
    createVueRouterRouteFromDefinition(route, options),
  )
}

function createVueRouterRouteFromDefinition(
  route: SDUIRouteDefinition,
  options: VueRouterManifestRouteOptions,
): VueRouterRouteRecordLike {
  return compactRouteRecord({
    path: route.path,
    name: route.id,
    component: options.componentForRoute?.(route) ?? options.component,
    components: options.componentsForRoute?.(route) ?? options.components,
    redirect: options.redirectForRoute?.(route) ?? options.redirect,
    beforeEnter: options.beforeEnterForRoute?.(route) ?? options.beforeEnter,
    meta: {
      routeId: route.id,
      screenId: route.screenId,
      title: route.title,
      metadata: route.metadata,
      sduiRoute: route,
      ...options.meta?.(route),
    },
    children: route.children?.map((child) =>
      createVueRouterRouteFromDefinition(child, options),
    ),
  })
}

function normalizeQueryFromSearch(
  searchParams: URLSearchParams,
): Record<string, string> {
  const query: Record<string, string> = {}

  searchParams.forEach((value, key) => {
    query[key] = value
  })

  return query
}

function normalizeParams(
  params?: Record<string, VueRouterValue>,
): Record<string, string> | undefined {
  if (!params) {
    return undefined
  }

  const normalized: Record<string, string> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) {
      return
    }

    if (Array.isArray(value)) {
      const segments = value
        .filter((item) => item != null)
        .map((item) => String(item))

      if (segments.length > 0) {
        normalized[key] = segments.join('/')
      }
      return
    }

    normalized[key] = String(value)
  })

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function normalizeQueryRecord(
  query?: Record<string, VueRouterValue>,
): Record<string, string> | undefined {
  if (!query) {
    return undefined
  }

  const normalized: Record<string, string> = {}

  Object.entries(query).forEach(([key, value]) => {
    if (value == null) {
      return
    }

    if (Array.isArray(value)) {
      const last = [...value].reverse().find((item) => item != null)

      if (last != null) {
        normalized[key] = String(last)
      }
      return
    }

    normalized[key] = String(value)
  })

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function pathFromFullPath(fullPath?: string): string | undefined {
  if (!fullPath) {
    return undefined
  }

  return fullPath.split(/[?#]/, 1)[0] || '/'
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

function compactLocation(
  location: VueRouterLocationLike,
): VueRouterLocationLike {
  return Object.fromEntries(
    Object.entries(location).filter((entry) => entry[1] !== undefined),
  ) as VueRouterLocationLike
}

function compactRouteRecord(
  route: VueRouterRouteRecordLike,
): VueRouterRouteRecordLike {
  return Object.fromEntries(
    Object.entries(route).filter((entry) => entry[1] !== undefined),
  ) as VueRouterRouteRecordLike
}
