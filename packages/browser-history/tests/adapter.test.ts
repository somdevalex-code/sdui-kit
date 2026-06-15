import { describe, expect, it, vi } from 'vitest'

import {
  createBrowserHistoryNavigationAdapter,
  createBrowserHistoryRouteContext,
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
})
