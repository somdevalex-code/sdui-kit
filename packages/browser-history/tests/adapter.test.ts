import { describe, expect, it, vi } from 'vitest'

import {
  createBrowserHistoryNavigationAdapter,
  createBrowserHistoryRouteContext,
  withQuery,
} from '../src'

describe('@sdui-kit/browser-history', () => {
  it('pushes and replaces browser history entries', () => {
    const history = {
      pushState: vi.fn(),
      replaceState: vi.fn(),
      back: vi.fn(),
    }
    const onChange = vi.fn()
    const adapter = createBrowserHistoryNavigationAdapter({ history, onChange })

    adapter.navigate(
      {
        type: 'navigate',
        to: '/applications',
        query: { status: 'active' },
        state: { from: 'dashboard' },
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

    expect(history.pushState).toHaveBeenCalledWith(
      { from: 'dashboard' },
      '',
      '/applications?status=active',
    )
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/login')
    expect(history.back).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith(
      '/applications?status=active',
      expect.objectContaining({ to: '/applications' }),
    )
  })

  it('builds route context from URLs and state', () => {
    expect(
      createBrowserHistoryRouteContext({
        url: '/applications/42?tab=summary',
        state: { from: 'list' },
        screenId: 'applications.details',
      }),
    ).toEqual({
      path: '/applications/42',
      screenId: 'applications.details',
      query: { tab: 'summary' },
      state: { from: 'list' },
    })
  })

  it('requires browser history when no history object is provided', () => {
    const adapter = createBrowserHistoryNavigationAdapter()

    expect(() => adapter.goBack({})).toThrow(
      'Browser history adapter requires a history object',
    )
  })

  it('skips empty and nullish query values', () => {
    expect(withQuery('/applications', {})).toBe('/applications')
    expect(
      withQuery('/applications?tab=summary#details', {
        tab: null,
        page: 2,
        empty: undefined,
      }),
    ).toBe('/applications?tab=summary&page=2#details')
  })

  it('uses location fallback and compacts empty route context values', () => {
    expect(
      createBrowserHistoryRouteContext({
        location: { pathname: '', search: '' },
        state: 'not-an-object',
      }),
    ).toEqual({ path: '/' })

    expect(
      createBrowserHistoryRouteContext({
        location: { pathname: '/applications', search: '?' },
        state: null,
      }),
    ).toEqual({ path: '/applications' })
  })

  it('reads browser location and normalizes browser history state', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'https://app.example.test/applications?tab=summary',
        origin: 'https://app.example.test',
      },
      history: {
        state: ['not', 'an', 'object'],
      },
    })

    try {
      expect(createBrowserHistoryRouteContext()).toEqual({
        path: '/applications',
        query: { tab: 'summary' },
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
