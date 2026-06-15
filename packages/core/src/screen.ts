import { CacheAdapter } from './adapters.js'
import {
  InvalidationTag,
  MaybePromise,
  RuntimeContext,
  SDUINode,
} from './types.js'

export interface RouteContext {
  path: string
  screenId?: string
  params?: Record<string, string>
  query?: Record<string, string>
  state?: Record<string, unknown>
}

export interface ScreenRequest {
  route: RouteContext
  screenId?: string
  signal?: AbortSignal
}

export interface ScreenCachePolicy {
  key?: string
  ttlMs?: number
  tags?: InvalidationTag[]
}

export interface SDUIRouteParamDefinition {
  type?: 'string' | 'number' | 'boolean'
  required?: boolean
  description?: string
  metadata?: Record<string, unknown>
}

export interface SDUIRouteDefinition {
  id: string
  path: string
  screenId?: string
  title?: string
  params?: Record<string, SDUIRouteParamDefinition>
  metadata?: Record<string, unknown>
  children?: SDUIRouteDefinition[]
}

export interface SDUIRouteManifest {
  schemaVersion: string
  routes: SDUIRouteDefinition[]
  metadata?: Record<string, unknown>
}

export interface SDUIScreenRenderResponse {
  schemaVersion: string
  status?: 'ok'
  node: SDUINode | SDUINode[]
  data?: Record<string, unknown>
  meta?: Record<string, unknown>
  cache?: ScreenCachePolicy
}

export interface SDUIScreenRedirectResponse {
  schemaVersion: string
  status: 'redirect'
  to: string
  query?: Record<string, unknown>
  replace?: boolean
  state?: Record<string, unknown>
  meta?: Record<string, unknown>
  cache?: ScreenCachePolicy
}

export interface SDUIScreenNotFoundResponse {
  schemaVersion: string
  status: 'notFound'
  message?: string
  node?: SDUINode | SDUINode[]
  data?: Record<string, unknown>
  meta?: Record<string, unknown>
  cache?: ScreenCachePolicy
}

export type SDUIScreenResponse =
  | SDUIScreenRenderResponse
  | SDUIScreenRedirectResponse
  | SDUIScreenNotFoundResponse

export type ScreenStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'refreshing'

export interface ScreenState {
  status: ScreenStatus
  route: RouteContext
  response?: SDUIScreenResponse
  error?: unknown
}

export type ScreenLoader = (
  request: ScreenRequest,
  context?: RuntimeContext,
) => MaybePromise<SDUIScreenResponse>

export type ScreenListener = (state: ScreenState) => void

export interface ScreenStoreAdapter {
  getState(): ScreenState
  subscribe(listener: ScreenListener): () => void
  load(route?: RouteContext, context?: RuntimeContext): Promise<ScreenState>
  refresh(context?: RuntimeContext): Promise<ScreenState>
  setRoute(route: RouteContext, context?: RuntimeContext): Promise<ScreenState>
}

export interface ScreenStoreOptions {
  route: RouteContext
  loader: ScreenLoader
  cache?: CacheAdapter
}

export class ScreenStore implements ScreenStoreAdapter {
  private readonly loader: ScreenLoader
  private readonly cache?: CacheAdapter
  private readonly listeners = new Set<ScreenListener>()
  private state: ScreenState
  private abortController?: AbortController
  private loadId = 0

  constructor(options: ScreenStoreOptions) {
    this.loader = options.loader
    this.cache = options.cache
    this.state = {
      status: 'idle',
      route: copyRoute(options.route),
    }
  }

  getState(): ScreenState {
    return copyState(this.state)
  }

  subscribe(listener: ScreenListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())

    return () => {
      this.listeners.delete(listener)
    }
  }

  async setRoute(
    route: RouteContext,
    context: RuntimeContext = {},
  ): Promise<ScreenState> {
    return this.load(route, context)
  }

  async refresh(context: RuntimeContext = {}): Promise<ScreenState> {
    return this.loadInternal(this.state.route, context, true)
  }

  async load(
    route: RouteContext = this.state.route,
    context: RuntimeContext = {},
  ): Promise<ScreenState> {
    return this.loadInternal(route, context, false)
  }

  private async loadInternal(
    route: RouteContext,
    context: RuntimeContext,
    forceRefresh: boolean,
  ): Promise<ScreenState> {
    this.abortController?.abort()
    const loadId = this.loadId + 1
    this.loadId = loadId

    const abortController =
      typeof AbortController !== 'undefined' ? new AbortController() : undefined
    this.abortController = abortController

    const routeCopy = copyRoute(route)
    const status: ScreenStatus =
      forceRefresh && this.state.response ? 'refreshing' : 'loading'

    this.setState({
      ...this.state,
      status,
      route: routeCopy,
      error: undefined,
    })

    try {
      const response = await this.loader(
        {
          route: routeCopy,
          screenId: routeCopy.screenId,
          signal: abortController?.signal,
        },
        context,
      )

      if (this.isStaleLoad(loadId)) {
        return this.getState()
      }

      if (response.cache?.key && this.cache) {
        await this.cache.set(response.cache.key, response, {
          ttlMs: response.cache.ttlMs,
          tags: response.cache.tags,
        })
      }

      if (this.isStaleLoad(loadId)) {
        return this.getState()
      }

      this.setState({
        status: 'success',
        route: routeCopy,
        response,
        error: undefined,
      })

      return this.getState()
    } catch (error) {
      if (this.isStaleLoad(loadId)) {
        return this.getState()
      }

      this.setState({
        ...this.state,
        status: 'error',
        route: routeCopy,
        error,
      })

      return this.getState()
    } finally {
      if (!this.isStaleLoad(loadId) && this.abortController === abortController) {
        this.abortController = undefined
      }
    }
  }

  private isStaleLoad(loadId: number): boolean {
    return loadId !== this.loadId
  }

  private setState(state: ScreenState): void {
    this.state = copyState(state)
    this.listeners.forEach((listener) => listener(this.getState()))
  }
}

export function createScreenStore(options: ScreenStoreOptions): ScreenStore {
  return new ScreenStore(options)
}

export function isRenderableScreenResponse(
  response: SDUIScreenResponse,
): response is SDUIScreenRenderResponse | (SDUIScreenNotFoundResponse & {
  node: SDUINode | SDUINode[]
}) {
  return 'node' in response && response.node !== undefined
}

function copyState(state: ScreenState): ScreenState {
  return {
    ...state,
    route: copyRoute(state.route),
    response: state.response,
  }
}

function copyRoute(route: RouteContext): RouteContext {
  return {
    ...route,
    params: route.params ? { ...route.params } : undefined,
    query: route.query ? { ...route.query } : undefined,
    state: route.state ? { ...route.state } : undefined,
  }
}
