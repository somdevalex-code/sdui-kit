import { CacheAdapter } from './adapters'
import {
  InvalidationTag,
  MaybePromise,
  RuntimeContext,
  SDUINode,
} from './types'

export interface RouteContext {
  path: string
  params?: Record<string, string>
  query?: Record<string, string>
  state?: Record<string, unknown>
}

export interface ScreenRequest {
  route: RouteContext
  signal?: AbortSignal
}

export interface ScreenCachePolicy {
  key?: string
  ttlMs?: number
  tags?: InvalidationTag[]
}

export interface SDUIScreenResponse {
  schemaVersion: string
  node: SDUINode | SDUINode[]
  data?: Record<string, unknown>
  meta?: Record<string, unknown>
  cache?: ScreenCachePolicy
}

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
    this.abortController =
      typeof AbortController !== 'undefined' ? new AbortController() : undefined

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
          signal: this.abortController?.signal,
        },
        context,
      )

      if (response.cache?.key && this.cache) {
        await this.cache.set(response.cache.key, response, {
          ttlMs: response.cache.ttlMs,
          tags: response.cache.tags,
        })
      }

      this.setState({
        status: 'success',
        route: routeCopy,
        response,
        error: undefined,
      })

      return this.getState()
    } catch (error) {
      this.setState({
        ...this.state,
        status: 'error',
        route: routeCopy,
        error,
      })

      return this.getState()
    }
  }

  private setState(state: ScreenState): void {
    this.state = copyState(state)
    this.listeners.forEach((listener) => listener(this.getState()))
  }
}

export function createScreenStore(options: ScreenStoreOptions): ScreenStore {
  return new ScreenStore(options)
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
