import {
  RouteContext,
  SDUIRouteDefinition,
  SDUIRouteManifest,
} from '@sdui-kit/core'

export type TanStackRouteValue =
  | string
  | string[]
  | number
  | boolean
  | null
  | undefined

export type TanStackSearchLike =
  | URLSearchParams
  | {
      forEach(callback: (value: string, key: string) => void): void
    }
  | Record<string, TanStackRouteValue>

export interface TanStackRouteContextOptions {
  pathname: string
  params?: Record<string, TanStackRouteValue>
  search?: TanStackSearchLike
  state?: unknown
  screenId?: string
}

export interface TanStackRouteOptionsLike {
  id?: string
  path?: string
  component?: unknown
  loader?: unknown
  beforeLoad?: unknown
  staticData?: Record<string, unknown>
  children?: TanStackRouteOptionsLike[]
}

export interface TanStackCatchAllRouteOptions {
  id?: string
  path?: string
  component?: unknown
  loader?: unknown
  beforeLoad?: unknown
  staticData?: Record<string, unknown>
}

export interface TanStackManifestRouteOptions {
  component?: unknown
  loader?: unknown
  beforeLoad?: unknown
  componentForRoute?: (route: SDUIRouteDefinition) => unknown
  loaderForRoute?: (route: SDUIRouteDefinition) => unknown
  beforeLoadForRoute?: (route: SDUIRouteDefinition) => unknown
  staticData?: (route: SDUIRouteDefinition) => Record<string, unknown>
}

export function createTanStackRouteContext(
  options: TanStackRouteContextOptions,
): RouteContext {
  return compactRoute({
    path: options.pathname || '/',
    screenId: options.screenId,
    params: normalizeValues(options.params),
    query: normalizeSearch(options.search),
    state: normalizeState(options.state),
  })
}

export function createTanStackCatchAllRouteOptions(
  options: TanStackCatchAllRouteOptions = {},
): TanStackRouteOptionsLike {
  return compactRouteOptions({
    id: options.id,
    path: options.path ?? '$',
    component: options.component,
    loader: options.loader,
    beforeLoad: options.beforeLoad,
    staticData: options.staticData,
  })
}

export function createTanStackRoutesFromManifest(
  manifest: SDUIRouteManifest,
  options: TanStackManifestRouteOptions = {},
): TanStackRouteOptionsLike[] {
  return manifest.routes.map((route) =>
    createTanStackRouteFromDefinition(route, options),
  )
}

function createTanStackRouteFromDefinition(
  route: SDUIRouteDefinition,
  options: TanStackManifestRouteOptions,
): TanStackRouteOptionsLike {
  const path = toTanStackRoutePath(route.path)

  return compactRouteOptions({
    id: path ? undefined : route.id,
    path: path || undefined,
    component: options.componentForRoute?.(route) ?? options.component,
    loader: options.loaderForRoute?.(route) ?? options.loader,
    beforeLoad: options.beforeLoadForRoute?.(route) ?? options.beforeLoad,
    staticData: {
      routeId: route.id,
      screenId: route.screenId,
      title: route.title,
      metadata: route.metadata,
      sduiRoute: route,
      ...options.staticData?.(route),
    },
    children: route.children?.map((child) =>
      createTanStackRouteFromDefinition(child, options),
    ),
  })
}

export function toTanStackRoutePath(path: string): string {
  return path
    .split('/')
    .map((segment) => {
      if (!segment.startsWith(':') || segment.length === 1) {
        return segment
      }

      const paramName = segment.slice(1)

      if (paramName.endsWith('?')) {
        return `{-$${paramName.slice(0, -1)}}`
      }

      return `$${paramName}`
    })
    .join('/')
}

function normalizeSearch(
  search?: TanStackSearchLike,
): Record<string, string> | undefined {
  if (!search) {
    return undefined
  }

  if (hasSearchForEach(search)) {
    const query: Record<string, string> = {}
    search.forEach((value, key) => {
      query[key] = value
    })
    return Object.keys(query).length > 0 ? query : undefined
  }

  return normalizeSearchRecord(search)
}

function hasSearchForEach(
  value: TanStackSearchLike,
): value is URLSearchParams | {
  forEach(callback: (value: string, key: string) => void): void
} {
  return typeof (value as { forEach?: unknown }).forEach === 'function'
}

function normalizeValues(
  values?: Record<string, TanStackRouteValue>,
): Record<string, string> | undefined {
  if (!values) {
    return undefined
  }

  const normalized: Record<string, string> = {}

  Object.entries(values).forEach(([key, value]) => {
    if (value == null) {
      return
    }

    normalized[key] = Array.isArray(value) ? value.join('/') : String(value)
  })

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function normalizeSearchRecord(
  search: Record<string, TanStackRouteValue>,
): Record<string, string> | undefined {
  const normalized: Record<string, string> = {}

  Object.entries(search).forEach(([key, value]) => {
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

function compactRouteOptions(
  route: TanStackRouteOptionsLike,
): TanStackRouteOptionsLike {
  return Object.fromEntries(
    Object.entries(route).filter((entry) => entry[1] !== undefined),
  ) as TanStackRouteOptionsLike
}
