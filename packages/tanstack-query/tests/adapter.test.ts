import { describe, expect, it, vi } from 'vitest'

import {
  createTanStackSDUIAdapter,
  defaultScreenKey,
  defaultTagKey,
  type QueryClientLike,
} from '../src'

function createQueryClient(): QueryClientLike & {
  invalidateQueries: ReturnType<typeof vi.fn>
  refetchQueries: ReturnType<typeof vi.fn>
} {
  const data = new Map<string, unknown>()
  const invalidateQueries = vi.fn()
  const refetchQueries = vi.fn()

  return {
    getQueryData: (key) => data.get(JSON.stringify(key)),
    setQueryData: (key, value) => {
      data.set(JSON.stringify(key), value)
    },
    invalidateQueries,
    refetchQueries,
  }
}

describe('@sdui-kit/tanstack-query', () => {
  it('creates stable screen and tag keys', () => {
    expect(defaultScreenKey({ path: '/applications' })).toEqual([
      'sdui',
      'screen',
      '/applications',
      {},
      {},
    ])
    expect(defaultTagKey({ type: 'Application', id: 1 })).toEqual([
      'sdui',
      'tag',
      'Application',
      1,
    ])
  })

  it('loads screens and stores them in the query client', async () => {
    const queryClient = createQueryClient()
    const adapter = createTanStackSDUIAdapter({
      queryClient,
      fetchScreen: async () => ({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
        cache: { key: 'screen:/applications' },
      }),
    })

    const response = await adapter.screenLoader({
      route: { path: '/applications' },
    })

    expect(response.schemaVersion).toBe('1.0')
    expect(queryClient.getQueryData(['screen:/applications'])).toBe(response)
  })

  it('gets, sets, and refetches cache entries', async () => {
    const queryClient = createQueryClient()
    const adapter = createTanStackSDUIAdapter({
      queryClient,
      fetchScreen: async () => ({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
      }),
    })

    await adapter.cache.set('answer', { value: 42 }, { ttlMs: 1000 })

    expect(adapter.cache.get('answer')).toEqual({ value: 42 })
    await adapter.cache.refetch?.('answer', {})

    expect(queryClient.refetchQueries).toHaveBeenCalledWith({
      queryKey: ['answer'],
    })
  })

  it('invalidates tags through query client', async () => {
    const queryClient = createQueryClient()
    const adapter = createTanStackSDUIAdapter({
      queryClient,
      fetchScreen: async () => ({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
      }),
    })

    await adapter.cache.invalidate(['Applications'], {})

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['sdui', 'tag', 'Applications'],
    })
  })

  it('invalidates the SDUI namespace when no tags are provided', async () => {
    const queryClient = createQueryClient()
    const adapter = createTanStackSDUIAdapter({
      queryClient,
      fetchScreen: async () => ({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
      }),
    })

    await adapter.cache.invalidate([], {})

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['sdui'],
    })
  })

  it('delegates data requests and reports missing request handlers', async () => {
    const queryClient = createQueryClient()
    const request = vi.fn(async () => ({ ok: true }))
    const adapter = createTanStackSDUIAdapter({
      queryClient,
      request,
      fetchScreen: async () => ({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
      }),
    })

    await expect(
      adapter.data.request(
        {
          endpoint: '/api/save',
          method: 'POST',
          body: { name: 'Ada' },
        },
        { form: { values: { name: 'Ada' } } },
      ),
    ).resolves.toEqual({ ok: true })
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: '/api/save' }),
      expect.objectContaining({ form: expect.any(Object) }),
    )

    const missingRequest = createTanStackSDUIAdapter({
      queryClient,
      fetchScreen: async () => ({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
      }),
    })

    expect(() =>
      missingRequest.data.request(
        { endpoint: '/api/save', method: 'POST' },
        {},
      ),
    ).toThrow('TanStack SDUI adapter requires a request function')
  })

  it('uses custom screen and tag keys without a response cache key', async () => {
    const queryClient = createQueryClient()
    const screenKey = vi.fn((route) => ['custom', 'screen', route.path])
    const tagKey = vi.fn((tag) => ['custom', 'tag', tag])
    const adapter = createTanStackSDUIAdapter({
      queryClient,
      screenKey,
      tagKey,
      fetchScreen: async () => ({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
      }),
    })

    const response = await adapter.screenLoader({
      route: { path: '/custom' },
    })
    await adapter.cache.invalidate([{ type: 'Application', id: 1 }], {})

    expect(screenKey).toHaveBeenCalledWith({ path: '/custom' })
    expect(queryClient.getQueryData(['custom', 'screen', '/custom'])).toBe(
      response,
    )
    expect(tagKey).toHaveBeenCalledWith({ type: 'Application', id: 1 })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['custom', 'tag', { type: 'Application', id: 1 }],
    })
  })
})
