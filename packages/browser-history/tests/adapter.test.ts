import { describe, expect, it, vi } from 'vitest'

import { createBrowserHistoryNavigationAdapter } from '../src'

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
})
