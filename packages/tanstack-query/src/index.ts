import {
  CacheAdapter,
  CacheSetOptions,
  DataAdapter,
  DataRequest,
  InvalidationTag,
  RouteContext,
  RuntimeContext,
  ScreenLoader,
  SDUIScreenResponse,
} from '@sdui-kit/core'

export type QueryKey = readonly unknown[]

export interface QueryClientLike {
  getQueryData<T>(queryKey: QueryKey): T | undefined
  setQueryData<T>(queryKey: QueryKey, value: T): void
  invalidateQueries(filters?: { queryKey?: QueryKey; exact?: boolean }): unknown
  refetchQueries?(filters?: { queryKey?: QueryKey; exact?: boolean }): unknown
}

export interface TanStackSDUIAdapterOptions {
  queryClient: QueryClientLike
  fetchScreen: (
    request: { route: RouteContext; signal?: AbortSignal },
    context?: RuntimeContext,
  ) => Promise<SDUIScreenResponse>
  request?: (
    request: DataRequest,
    context: RuntimeContext,
  ) => Promise<unknown>
  screenKey?: (route: RouteContext) => QueryKey
  tagKey?: (tag: InvalidationTag) => QueryKey
}

export interface TanStackSDUIAdapter {
  data: DataAdapter
  cache: CacheAdapter
  screenLoader: ScreenLoader
  screenKey(route: RouteContext): QueryKey
  tagKey(tag: InvalidationTag): QueryKey
}

export function createTanStackSDUIAdapter(
  options: TanStackSDUIAdapterOptions,
): TanStackSDUIAdapter {
  const screenKey = options.screenKey ?? defaultScreenKey
  const tagKey = options.tagKey ?? defaultTagKey

  const cache: CacheAdapter = {
    get: (key) => options.queryClient.getQueryData([key]),
    set: (key, value, _setOptions?: CacheSetOptions) => {
      options.queryClient.setQueryData([key], value)
    },
    invalidate: async (tags) => {
      if (tags.length === 0) {
        await options.queryClient.invalidateQueries({ queryKey: ['sdui'] })
        return
      }

      await Promise.all(
        tags.map((tag) =>
          options.queryClient.invalidateQueries({ queryKey: tagKey(tag) }),
        ),
      )
    },
    refetch: (key) => options.queryClient.refetchQueries?.({ queryKey: [key] }),
  }

  const data: DataAdapter = {
    request: (request, context) => {
      if (!options.request) {
        throw new Error('TanStack SDUI adapter requires a request function')
      }

      return options.request(request, context)
    },
  }

  const screenLoader: ScreenLoader = async (request, context) => {
    const response = await options.fetchScreen(request, context)
    const key = response.cache?.key

    if (key) {
      options.queryClient.setQueryData([key], response)
    }

    options.queryClient.setQueryData(screenKey(request.route), response)
    return response
  }

  return {
    data,
    cache,
    screenLoader,
    screenKey,
    tagKey,
  }
}

export function defaultScreenKey(route: RouteContext): QueryKey {
  return ['sdui', 'screen', route.path, route.params ?? {}, route.query ?? {}]
}

export function defaultTagKey(tag: InvalidationTag): QueryKey {
  return typeof tag === 'string'
    ? ['sdui', 'tag', tag]
    : ['sdui', 'tag', tag.type, tag.id ?? '']
}
