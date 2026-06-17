import { describe, expect, it, vi } from 'vitest'

import {
  createNextNavigationAdapter,
  createNextRouteContext,
  withQuery,
} from '../src'

describe('@sdui-kit/next', () => {
  it('delegates push, replace, and back to a Next-like router', () => {
    const router = {
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
    }
    const onNavigate = vi.fn()
    const adapter = createNextNavigationAdapter({
      router,
      scroll: false,
      onNavigate,
    })

    adapter.navigate(
      {
        type: 'navigate',
        to: '/applications',
        query: { status: 'active' },
      },
      {},
    )
    adapter.navigate(
      {
        type: 'navigate',
        to: '/login',
        replace: true,
      },
      {},
    )
    adapter.goBack({})

    expect(router.push).toHaveBeenCalledWith('/applications?status=active', {
      scroll: false,
    })
    expect(router.replace).toHaveBeenCalledWith('/login', { scroll: false })
    expect(router.back).toHaveBeenCalled()
    expect(onNavigate).toHaveBeenCalledWith(
      '/applications?status=active',
      expect.objectContaining({ to: '/applications' }),
    )
  })

  it('builds query strings while skipping empty and nullish values', () => {
    expect(withQuery('/applications', {})).toBe('/applications')
    expect(
      withQuery('/applications?tab=summary#details', {
        tab: null,
        page: 2,
      }),
    ).toBe('/applications?tab=summary&page=2#details')
  })

  it('builds route context from App Router pathname and params', () => {
    expect(
      createNextRouteContext({
        pathname: '/applications/42',
        params: { slug: ['applications', '42'], ignored: undefined },
        searchParams: new URLSearchParams('tab=summary'),
        screenId: 'applications.details',
      }),
    ).toEqual({
      path: '/applications/42',
      screenId: 'applications.details',
      params: { slug: 'applications/42' },
      query: { tab: 'summary' },
    })
  })

  it('normalizes App Router search param arrays without path joining', () => {
    expect(
      createNextRouteContext({
        pathname: '/applications',
        searchParams: { tag: ['a', 'b'], page: 2 },
      }).query,
    ).toEqual({
      tag: 'b',
      page: '2',
    })
  })

  it('compacts empty pathname, params, search params, and state', () => {
    expect(
      createNextRouteContext({
        pathname: '',
        params: { slug: undefined },
        searchParams: undefined,
        state: 'not-an-object',
      }),
    ).toEqual({ path: '/' })
  })

  it('skips null and empty record search values', () => {
    expect(
      createNextRouteContext({
        pathname: '/applications',
        searchParams: {
          tag: [],
          page: null,
          status: 'active',
        },
      }).query,
    ).toEqual({ status: 'active' })
  })

  it('compacts empty URLSearchParams and preserves object state', () => {
    expect(
      createNextRouteContext({
        pathname: '/applications',
        searchParams: new URLSearchParams(),
        state: { from: 'dashboard' },
      }),
    ).toEqual({
      path: '/applications',
      state: { from: 'dashboard' },
    })
  })
})
