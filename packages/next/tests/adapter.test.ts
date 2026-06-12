import { describe, expect, it, vi } from 'vitest'

import { createNextNavigationAdapter } from '../src'

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
})
