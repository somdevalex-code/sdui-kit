import { describe, expect, it, vi } from 'vitest'

import { createReactRouterNavigationAdapter, withQuery } from '../src'

describe('@sdui-kit/react-router', () => {
  it('builds query strings', () => {
    expect(withQuery('/applications', { status: 'active', page: 2 })).toBe(
      '/applications?status=active&page=2',
    )
  })

  it('delegates navigate and goBack', () => {
    const navigate = vi.fn()
    const adapter = createReactRouterNavigationAdapter({ navigate })

    adapter.navigate(
      {
        type: 'navigate',
        to: '/applications',
        query: { status: 'active' },
        replace: true,
      },
      {},
    )
    adapter.goBack({})

    expect(navigate).toHaveBeenCalledWith('/applications?status=active', {
      replace: true,
      state: undefined,
    })
    expect(navigate).toHaveBeenCalledWith(-1)
  })
})
