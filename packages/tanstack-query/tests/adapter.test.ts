import { describe, expect, it, vi } from 'vitest'

import {
  createTanStackSDUIAdapter,
  defaultScreenKey,
  defaultTagKey,
  type QueryClientLike,
} from '../src'

function createQueryClient(): QueryClientLike & {
  invalidateQueries: ReturnType<typeof vi.fn>
} {
  const data = new Map<string, unknown>()

  return {
    getQueryData: (key) => data.get(JSON.stringify(key)),
    setQueryData: (key, value) => {
      data.set(JSON.stringify(key), value)
    },
    invalidateQueries: vi.fn(),
    refetchQueries: vi.fn(),
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
})
