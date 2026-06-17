import { describe, expect, it, vi } from 'vitest'

import {
  ActionRunner,
  createActionRunner,
  isRequestAction,
  isSequenceAction,
  isUIAction,
  isUIOnlyAction,
  type RuntimeContext,
  type SDUIAction,
} from '../src'

describe('ActionRunner', () => {
  it('skips empty actions and actions with false conditions', async () => {
    const toast = vi.fn()
    const runner = new ActionRunner({ toast })

    await expect(runner.run(null)).resolves.toBeUndefined()
    await expect(runner.run(undefined)).resolves.toBeUndefined()
    await expect(
      runner.run({
        type: 'toast',
        message: 'Hidden',
        when: { eq: [{ var: 'visible' }, true] },
      }, { visible: false }),
    ).resolves.toBeUndefined()

    expect(toast).not.toHaveBeenCalled()
  })

  it('respects confirmation adapters before running actions', async () => {
    const confirm = vi.fn(async () => false)
    const toast = vi.fn()
    const context = { data: { id: 1 } }
    const runner = new ActionRunner({ confirm, toast })

    await expect(
      runner.run(
        {
          type: 'toast',
          message: 'Delete',
          confirm: { title: 'Confirm delete' },
        },
        context,
      ),
    ).resolves.toBeUndefined()

    expect(confirm).toHaveBeenCalledWith({ title: 'Confirm delete' }, context)
    expect(toast).not.toHaveBeenCalled()

    confirm.mockResolvedValueOnce(true)

    await runner.run(
      {
        type: 'toast',
        message: 'Deleted',
        confirm: { title: 'Confirm delete' },
      },
      context,
    )

    expect(confirm).toHaveBeenCalledTimes(2)
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Deleted', confirm: undefined }),
      context,
    )
  })

  it('treats missing confirmation adapters as confirmed', async () => {
    const toast = vi.fn()
    const runner = new ActionRunner({ toast })

    await runner.run({
      type: 'toast',
      message: 'Confirmed by default',
      confirm: { title: 'Continue?' },
    })

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Confirmed by default' }),
      {},
    )
  })

  it('runs many actions in order and preserves skipped results', async () => {
    const calls: string[] = []
    const custom = vi.fn((action: SDUIAction, context: RuntimeContext) => {
      calls.push(action.type)
      return `${action.type}:${context.scope}`
    })
    const runner = new ActionRunner({
      custom: {
        first: custom,
        second: custom,
      },
    })

    await expect(
      runner.runMany(
        [
          { type: 'first' },
          null,
          { type: 'second', when: { var: 'enabled' } },
          { type: 'second' },
        ],
        { enabled: false, scope: 'batch' },
      ),
    ).resolves.toEqual(['first:batch', undefined, undefined, 'second:batch'])

    expect(calls).toEqual(['first', 'second'])
    expect(custom).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'second' }),
      expect.objectContaining({ scope: 'batch' }),
      runner,
    )
  })

  it('runs sequence and UI-only actions through nested dispatch', async () => {
    const toast = vi.fn()
    const runner = new ActionRunner({ toast })

    await runner.run({
      type: 'sequence',
      actions: [
        { type: 'toast', message: 'First' },
        {
          type: 'UI_ONLY',
          ui: { type: 'toast', message: 'Second' },
        },
      ],
    })
    await runner.run({
      type: 'uiSequence',
      actions: [{ type: 'toast', message: 'Third' }],
    })

    expect(toast.mock.calls.map(([action]) => action.message)).toEqual([
      'First',
      'Second',
      'Third',
    ])
  })

  it('runs custom handlers and unhandled action fallback handlers', async () => {
    const inspect = vi.fn(() => 'inspected')
    const fallback = vi.fn(() => 'handled')
    const customRunner = new ActionRunner({ custom: { inspect } })
    const fallbackRunner = new ActionRunner({ onUnhandledAction: fallback })

    await expect(
      customRunner.run({ type: 'inspect', payload: { id: 1 } }),
    ).resolves.toBe('inspected')
    await expect(
      fallbackRunner.run({ type: 'external', payload: { id: 2 } }),
    ).resolves.toBe('handled')

    expect(inspect).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'inspect' }),
      {},
      customRunner,
    )
    expect(fallback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'external' }),
      {},
      fallbackRunner,
    )
  })

  it('throws for unhandled actions when no fallback is registered', async () => {
    await expect(
      new ActionRunner().run({ type: 'external' }),
    ).rejects.toThrow('Unhandled SDUI action "external"')
  })

  it('requires a request adapter for request actions', async () => {
    const action = { type: 'request' as const, endpoint: '/api/save' }
    const onError = vi.fn()
    const runner = new ActionRunner({ onError })

    await expect(runner.run(action)).rejects.toThrow(
      'A request adapter is required to run request actions',
    )
    expect(onError).toHaveBeenCalledWith(expect.any(Error), action, {})
  })

  it('resolves request metadata, payloads, invalidation, and successUi actions', async () => {
    const request = vi.fn(async () => ({
      id: 1,
      tags: ['Applications', { type: 'Application', id: 1 }, null],
    }))
    const invalidate = vi.fn()
    const success = vi.fn()
    const signal = new AbortController().signal
    const runner = new ActionRunner({
      request,
      cache: {
        get: vi.fn(),
        set: vi.fn(),
        invalidate,
      },
      custom: { saved: success },
    })

    await expect(
      runner.run(
        {
          type: 'REQUEST',
          endpoint: '/api/save',
          headers: {
            Authorization: { $from: 'token' },
          },
          params: { $from: 'filters' },
          payload: {
            name: { $from: 'form.values.name' },
          },
          invalidate: { $from: 'response.tags' },
          successUi: { type: 'saved' },
        },
        {
          token: 'Bearer token',
          filters: { status: 'active' },
          form: { values: { name: 'Ada' } },
          signal,
        },
      ),
    ).resolves.toEqual({
      id: 1,
      tags: ['Applications', { type: 'Application', id: 1 }, null],
    })

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/api/save',
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        params: { status: 'active' },
        body: { name: 'Ada' },
        signal,
      }),
      expect.any(Object),
    )
    expect(invalidate).toHaveBeenCalledWith(
      ['Applications', { type: 'Application', id: 1 }],
      expect.objectContaining({
        response: {
          id: 1,
          tags: ['Applications', { type: 'Application', id: 1 }, null],
        },
      }),
    )
    expect(success).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'saved' }),
      expect.objectContaining({ response: expect.objectContaining({ id: 1 }) }),
      runner,
    )
  })

  it('runs errorUi actions with request errors before rethrowing', async () => {
    const error = new Error('Request failed')
    const failure = vi.fn()
    const runner = new ActionRunner({
      request: async () => {
        throw error
      },
      custom: { failure },
    })

    await expect(
      runner.run({
        type: 'request',
        endpoint: '/api/save',
        errorUi: { type: 'failure' },
      }),
    ).rejects.toThrow(error)

    expect(failure).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'failure' }),
      expect.objectContaining({ error }),
      runner,
    )
  })

  it('delegates UI actions to generic and specific fallback adapters', async () => {
    const context = { data: { id: 1 } }
    const ui = vi.fn(() => 'generic')
    const genericRunner = new ActionRunner({ ui })

    await expect(
      genericRunner.run({ type: 'toast', message: 'Generic' }, context),
    ).resolves.toBe('generic')
    expect(ui).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Generic' }),
      context,
    )

    const navigate = vi.fn()
    const goBack = vi.fn()
    const refreshScreen = vi.fn()
    const modalOpen = vi.fn()
    const modalClose = vi.fn()
    const drawerOpen = vi.fn()
    const drawerClose = vi.fn()
    const runner = new ActionRunner({
      navigate,
      goBack,
      refreshScreen,
      modal: {
        open: modalOpen,
        close: modalClose,
      },
      drawer: {
        open: drawerOpen,
        close: drawerClose,
      },
    })

    await runner.run({ type: 'navigate', to: '/details' }, context)
    await runner.run({ type: 'goBack' }, context)
    await runner.run({ type: 'refreshScreen' }, context)
    await runner.run({
      type: 'openModal',
      children: { componentName: 'Dialog' },
    }, context)
    await runner.run({ type: 'closeModal' }, context)
    await runner.run({
      type: 'drawerOpen',
      drawerId: 'filters',
      payload: { active: true },
    }, context)
    await runner.run({ type: 'drawerClose', drawerId: 'filters' }, context)

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/details' }),
      context,
    )
    expect(goBack).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'goBack' }),
      context,
    )
    expect(refreshScreen).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'refreshScreen' }),
      context,
    )
    expect(modalOpen).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'openModal' }),
      context,
    )
    expect(modalClose).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'closeModal' }),
      context,
    )
    expect(drawerOpen).toHaveBeenCalledWith(
      expect.objectContaining({ drawerId: 'filters' }),
      context,
    )
    expect(drawerClose).toHaveBeenCalledWith(
      expect.objectContaining({ drawerId: 'filters' }),
      context,
    )
  })

  it('creates runners and narrows action helper types', async () => {
    const toast = vi.fn()
    const runner = createActionRunner({ toast })

    await runner.run({ type: 'toast', message: 'Created' })

    expect(runner).toBeInstanceOf(ActionRunner)
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Created' }),
      {},
    )

    expect(isUIAction({ type: 'toast', message: 'Hi' })).toBe(true)
    expect(isUIAction({ type: 'request', endpoint: '/api/save' })).toBe(false)
    expect(isRequestAction({ type: 'request', endpoint: '/api/save' })).toBe(true)
    expect(isRequestAction({ type: 'REQUEST', endpoint: '/api/save' })).toBe(true)
    expect(isRequestAction({ type: 'request' } as SDUIAction)).toBe(false)
    expect(isSequenceAction({ type: 'sequence', actions: [] })).toBe(true)
    expect(isSequenceAction({ type: 'uiSequence', actions: [] })).toBe(true)
    expect(
      isSequenceAction({ type: 'sequence', actions: 'bad' } as unknown as SDUIAction),
    ).toBe(false)
    expect(isUIOnlyAction({
      type: 'UI_ONLY',
      ui: { type: 'toast', message: 'Nested' },
    })).toBe(true)
    expect(isUIOnlyAction({ type: 'UI_ONLY', ui: null } as unknown as SDUIAction)).toBe(false)
  })
})
