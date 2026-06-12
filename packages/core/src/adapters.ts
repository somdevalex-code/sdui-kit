import {
  HttpMethod,
  InvalidationTag,
  MaybePromise,
  RuntimeContext,
} from './types'

export interface DataRequest {
  endpoint: string
  method: HttpMethod
  headers?: Record<string, unknown>
  params?: unknown
  body?: unknown
  signal?: AbortSignal
}

export interface DataAdapter {
  request(request: DataRequest, context: RuntimeContext): MaybePromise<unknown>
}

export interface CacheSetOptions {
  ttlMs?: number
  tags?: InvalidationTag[]
}

export interface CacheAdapter {
  get<T>(key: string): MaybePromise<T | undefined>
  set<T>(key: string, value: T, options?: CacheSetOptions): MaybePromise<void>
  invalidate(
    tags: InvalidationTag[],
    context: RuntimeContext,
  ): MaybePromise<void>
  refetch?(key: string, context: RuntimeContext): MaybePromise<unknown>
}

export interface NavigateIntent {
  to: string
  query?: Record<string, unknown>
  replace?: boolean
  state?: Record<string, unknown>
}

export interface NavigationAdapter<TNavigate extends NavigateIntent = NavigateIntent> {
  navigate(action: TNavigate, context: RuntimeContext): MaybePromise<void>
  goBack(context: RuntimeContext): MaybePromise<void>
}

export function normalizeInvalidationTags(
  tags: unknown,
): InvalidationTag[] {
  if (tags == null) {
    return []
  }

  if (Array.isArray(tags)) {
    return tags.filter(isInvalidationTag)
  }

  return isInvalidationTag(tags) ? [tags] : []
}

export function isInvalidationTag(value: unknown): value is InvalidationTag {
  if (typeof value === 'string') {
    return value.length > 0
  }

  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string' &&
    value.type.length > 0
  )
}
