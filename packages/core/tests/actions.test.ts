import { describe, expect, it, vi } from 'vitest'

import {
  ActionRunner,
  createScreenStore,
  evaluateCondition,
  resolveExpression,
  validateSDUINode,
} from '../src'

describe('@sdui-kit/core', () => {
  it('resolves expressions against runtime context', () => {
    expect(
      resolveExpression(
        { and: [{ eq: [{ var: 'form.values.type' }, 'company'] }, { notEmpty: { var: 'form.values.name' } }] },
        { form: { values: { type: 'company', name: 'Acme' } } },
      ),
    ).toBe(true)

    expect(
      evaluateCondition(
        { includes: [{ var: 'user.roles' }, 'admin'] },
        { user: { roles: ['admin'] } },
      ),
    ).toBe(true)
  })

  it('runs request actions with resolved payload and success action', async () => {
    const toasts: string[] = []
    const request = vi.fn(async () => ({ id: 'created' }))
    const runner = new ActionRunner({
      request,
      toast: (action) => {
        toasts.push(action.message)
      },
    })

    const response = await runner.run(
      {
        type: 'request',
        endpoint: '/api/applications',
        method: 'POST',
        body: { $from: 'form.values' },
        success: {
          type: 'toast',
          message: 'Created',
          status: 'success',
        },
      },
      { form: { values: { name: 'Ada' } } },
    )

    expect(response).toEqual({ id: 'created' })
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/api/applications',
        method: 'POST',
        body: { name: 'Ada' },
      }),
      expect.any(Object),
    )
    expect(toasts).toEqual(['Created'])
  })

  it('delegates request actions to the generic data adapter', async () => {
    const request = vi.fn(async () => ({ ok: true }))
    const runner = new ActionRunner({
      data: { request },
    })

    await runner.run(
      {
        type: 'request',
        endpoint: '/api/save',
        method: 'PATCH',
        body: { name: { $from: 'form.values.name' } },
      },
      { form: { values: { name: 'Ada' } } },
    )

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/api/save',
        method: 'PATCH',
        body: { name: 'Ada' },
      }),
      expect.any(Object),
    )
  })

  it('delegates navigation and screen refresh through adapters', async () => {
    const navigate = vi.fn()
    const goBack = vi.fn()
    const refresh = vi.fn(async () => ({
      status: 'success' as const,
      route: { path: '/applications' },
    }))
    const runner = new ActionRunner({
      navigation: { navigate, goBack },
      screen: {
        getState: () => ({ status: 'idle', route: { path: '/applications' } }),
        subscribe: () => () => undefined,
        load: vi.fn(),
        setRoute: vi.fn(),
        refresh,
      },
    })

    await runner.run({
      type: 'navigate',
      to: '/applications',
      query: { status: 'active' },
      replace: true,
    })
    await runner.run({ type: 'goBack' })
    await runner.run({ type: 'refreshScreen' })

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/applications',
        query: { status: 'active' },
        replace: true,
      }),
      expect.any(Object),
    )
    expect(goBack).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
  })

  it('normalizes invalidation tags before calling cache adapter', async () => {
    const invalidate = vi.fn()
    const runner = new ActionRunner({
      data: { request: async () => ({ id: 1 }) },
      cache: {
        get: vi.fn(),
        set: vi.fn(),
        invalidate,
      },
    })

    await runner.run({
      type: 'request',
      endpoint: '/api/save',
      invalidate: ['Applications', { type: 'Application', id: 1 }, null],
    })

    expect(invalidate).toHaveBeenCalledWith(
      ['Applications', { type: 'Application', id: 1 }],
      expect.any(Object),
    )
  })

  it('loads, refreshes, and reports screen store state', async () => {
    const listener = vi.fn()
    const store = createScreenStore({
      route: { path: '/applications' },
      loader: async ({ route }) => ({
        schemaVersion: '1.0',
        node: { componentName: 'Text', props: { children: route.path } },
      }),
    })

    store.subscribe(listener)

    const loaded = await store.load()
    const refreshed = await store.refresh()

    expect(loaded.status).toBe('success')
    expect(refreshed.status).toBe('success')
    expect(store.getState().response?.node).toEqual({
      componentName: 'Text',
      props: { children: '/applications' },
    })
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'loading' }),
    )
  })

  it('stores screen load errors without throwing', async () => {
    const store = createScreenStore({
      route: { path: '/broken' },
      loader: async () => {
        throw new Error('No screen')
      },
    })

    const state = await store.load()

    expect(state.status).toBe('error')
    expect(state.error).toBeInstanceOf(Error)
  })

  it('validates SDUI nodes', () => {
    expect(
      validateSDUINode({
        schemaVersion: '1.0',
        componentName: 'button',
        props: {
          children: 'Submit',
          action: { type: 'toast', message: 'Done' },
        },
      }).valid,
    ).toBe(true)

    expect(validateSDUINode({ props: {} }).issues).toContainEqual({
      path: '$.componentName',
      message: 'componentName must be a non-empty string',
    })
  })
})
