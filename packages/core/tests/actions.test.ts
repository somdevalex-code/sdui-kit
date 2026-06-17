import { describe, expect, it, vi } from 'vitest'

import {
  ActionRunner,
  assertValidSDUINode,
  assertValidSDUIRouteManifest,
  assertValidSDUIScreenResponse,
  collectUnknownComponents,
  ComponentRegistry,
  createRequestAdapter,
  createRegistry,
  createScreenStore,
  evaluateCondition,
  getPath,
  isInvalidationTag,
  isRenderableScreenResponse,
  isSDUINode,
  normalizeInvalidationTags,
  resolveExpression,
  resolveValue,
  type SDUIScreenResponse,
  validateSDUIRouteManifest,
  validateSDUINode,
  validateSDUIScreenResponse,
} from '../src'

describe('@sdui-kit/core', () => {
  it('registers components with metadata and merges registries', () => {
    const text = Symbol('text')
    const button = Symbol('button')
    const registry = createRegistry({
      Text: {
        component: text,
        metadata: { injectRuntime: true },
      },
    })
    const extra = new ComponentRegistry({
      Button: button,
    })

    registry.register('Badge', Symbol('badge')).merge(extra)

    expect(registry.has('Text')).toBe(true)
    expect(registry.require('Text')).toEqual({
      component: text,
      metadata: { injectRuntime: true },
    })
    expect(registry.get('Button')?.component).toBe(button)
    expect(registry.entries().map(([name]) => name)).toEqual([
      'Text',
      'Badge',
      'Button',
    ])
  })

  it('throws useful registry errors for invalid component names', () => {
    const registry = createRegistry()

    expect(() => registry.register(' ', Symbol('empty'))).toThrow(
      'SDUI component name must be a non-empty string',
    )
    expect(() => registry.require('Missing')).toThrow(
      'SDUI component "Missing" is not registered',
    )
  })

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

  it('resolves values and object expressions recursively', () => {
    const context = {
      form: {
        values: {
          age: '42',
          tags: ['vip', 'new'],
          profile: { name: 'Ada' },
        },
      },
    }

    expect(
      resolveValue(
        {
          name: { $from: 'form.values.profile.name' },
          isAdult: { $expr: { gte: [{ var: 'form.values.age' }, 18] } },
          tags: [{ $from: 'form.values.tags[0]' }],
        },
        context,
      ),
    ).toEqual({
      name: 'Ada',
      isAdult: true,
      tags: ['vip'],
    })
    expect(
      resolveExpression(
        {
          fallback: { var: 'form.values.missing', fallback: 'n/a' },
          literal: { nested: [{ var: 'form.values.profile.name' }] },
        },
        context,
      ),
    ).toEqual({
      fallback: 'n/a',
      literal: { nested: ['Ada'] },
    })
  })

  it('evaluates expression operators and paths', () => {
    const context = {
      items: [{ count: 2 }, { count: 5 }],
      title: 'Server driven UI',
      emptyObject: {},
      profile: null,
    }

    expect(getPath(context, '')).toBe(context)
    expect(getPath(context, 'items[1].count')).toBe(5)
    expect(getPath(context, 'items.0.count')).toBe(2)
    expect(getPath(context, 'profile.name')).toBeUndefined()
    expect(getPath('text', 'length')).toBeUndefined()
    expect(resolveExpression({ gt: [{ var: 'items[1].count' }, 4] }, context)).toBe(true)
    expect(resolveExpression({ lt: [{ var: 'items[0].count' }, 1] }, context)).toBe(false)
    expect(resolveExpression({ lte: ['not-number', 1] }, context)).toBe(false)
    expect(resolveExpression({ neq: [{ var: 'items[0].count' }, 5] }, context)).toBe(true)
    expect(resolveExpression({ not: { var: 'missing' } }, context)).toBe(true)
    expect(resolveExpression({ or: [false, { includes: [{ var: 'title' }, 'driven'] }] }, context)).toBe(true)
    expect(resolveExpression({ includes: [{ var: 'items' }, { count: 2 }] }, context)).toBe(false)
    expect(resolveExpression({ includes: [123, '2'] }, context)).toBe(false)
    expect(resolveExpression({ includes: [{ count: 2 }, 2] }, context)).toBe(false)
    expect(resolveExpression({ empty: null }, context)).toBe(true)
    expect(resolveExpression({ empty: 0 }, context)).toBe(false)
    expect(resolveExpression({ empty: { var: 'emptyObject' } }, context)).toBe(true)
    expect(resolveExpression({ notEmpty: { var: 'items' } }, context)).toBe(true)
    expect(evaluateCondition(undefined, context, false)).toBe(false)
  })

  it('normalizes invalidation tags and rejects malformed tags', () => {
    expect(normalizeInvalidationTags(null)).toEqual([])
    expect(normalizeInvalidationTags(undefined)).toEqual([])
    expect(normalizeInvalidationTags({ type: 'Application', id: 1 })).toEqual([
      { type: 'Application', id: 1 },
    ])
    expect(normalizeInvalidationTags({ type: '' })).toEqual([])
    expect(
      normalizeInvalidationTags([
        'Applications',
        '',
        { type: 'Application', id: 1 },
        { type: '' },
        { id: 1 },
        42,
      ]),
    ).toEqual(['Applications', { type: 'Application', id: 1 }])

    expect(isInvalidationTag('Applications')).toBe(true)
    expect(isInvalidationTag('')).toBe(false)
    expect(isInvalidationTag({ type: 'Application' })).toBe(true)
    expect(isInvalidationTag({ type: '' })).toBe(false)
    expect(isInvalidationTag({ id: 1 })).toBe(false)
    expect(isInvalidationTag(null)).toBe(false)
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

  it('creates a data adapter from a simple request executor', async () => {
    const request = vi.fn(async () => ({ ok: true }))
    const adapter = createRequestAdapter(request)
    const runner = new ActionRunner({ data: adapter })

    await runner.run({
      type: 'request',
      endpoint: '/api/ping',
      method: 'GET',
    })

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/api/ping',
        method: 'GET',
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

  it('allows invalidate metadata without a cache adapter', async () => {
    const request = vi.fn(async () => ({ ok: true }))
    const runner = new ActionRunner({ request })

    await expect(
      runner.run({
        type: 'request',
        endpoint: '/api/save',
        invalidate: ['Applications'],
      }),
    ).resolves.toEqual({ ok: true })
    expect(request).toHaveBeenCalled()
  })

  it('runs request error actions when the mutation request fails', async () => {
    const toasts: string[] = []
    const request = vi.fn(async () => {
      throw new Error('Request failed')
    })
    const runner = new ActionRunner({
      request,
      toast: (action) => {
        toasts.push(action.message)
      },
    })

    await expect(
      runner.run({
        type: 'request',
        endpoint: '/api/save',
        error: {
          type: 'toast',
          message: 'Could not save',
          status: 'error',
        },
      }),
    ).rejects.toThrow('Request failed')

    expect(toasts).toEqual(['Could not save'])
  })

  it('does not run request error actions when a success action fails', async () => {
    const toasts: string[] = []
    const requestAction = {
      type: 'request' as const,
      endpoint: '/api/save',
      success: {
        type: 'toast' as const,
        message: 'Saved',
      },
      error: {
        type: 'toast' as const,
        message: 'Could not save',
        status: 'error' as const,
      },
    }
    const onError = vi.fn()
    const runner = new ActionRunner({
      request: async () => ({ ok: true }),
      toast: (action) => {
        if (action.message === 'Saved') {
          throw new Error('Toast failed')
        }

        toasts.push(action.message)
      },
      onError,
    })

    await expect(runner.run(requestAction)).rejects.toThrow('Toast failed')

    expect(toasts).toEqual([])
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      requestAction,
      expect.objectContaining({}),
    )
  })

  it('does not run request error actions when invalidation fails', async () => {
    const toasts: string[] = []
    const requestAction = {
      type: 'request' as const,
      endpoint: '/api/save',
      invalidate: ['Applications'],
      error: {
        type: 'toast' as const,
        message: 'Could not save',
        status: 'error' as const,
      },
    }
    const onError = vi.fn()
    const runner = new ActionRunner({
      request: async () => ({ ok: true }),
      cache: {
        get: vi.fn(),
        set: vi.fn(),
        invalidate: vi.fn(async () => {
          throw new Error('Invalidate failed')
        }),
      },
      toast: (action) => {
        toasts.push(action.message)
      },
      onError,
    })

    await expect(runner.run(requestAction)).rejects.toThrow('Invalidate failed')

    expect(toasts).toEqual([])
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      requestAction,
      expect.objectContaining({}),
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

  it('stops notifying screen store listeners after unsubscribe', async () => {
    const listener = vi.fn()
    const store = createScreenStore({
      route: { path: '/applications' },
      loader: async () => ({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
      }),
    })

    const unsubscribe = store.subscribe(listener)
    unsubscribe()
    await store.load()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'idle' }),
    )
  })

  it('writes screen responses to cache and exposes refreshing state', async () => {
    const listener = vi.fn()
    const cache = {
      get: vi.fn(),
      set: vi.fn(),
      invalidate: vi.fn(),
    }
    const store = createScreenStore({
      route: { path: '/applications' },
      cache,
      loader: async () => ({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
        cache: {
          key: 'screen:/applications',
          ttlMs: 1000,
          tags: ['Applications'],
        },
      }),
    })

    await store.load()
    store.subscribe(listener)
    listener.mockClear()

    const refresh = store.refresh()

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'refreshing' }),
    )
    await refresh
    expect(cache.set).toHaveBeenCalledWith(
      'screen:/applications',
      expect.objectContaining({ schemaVersion: '1.0' }),
      { ttlMs: 1000, tags: ['Applications'] },
    )
  })

  it('does not let stale screen loads overwrite state after cache writes', async () => {
    const cacheWrite = deferred<void>()
    const cache = {
      get: vi.fn(),
      set: vi.fn((key: string) => {
        return key === 'screen:/slow' ? cacheWrite.promise : undefined
      }),
      invalidate: vi.fn(),
    }
    const store = createScreenStore({
      route: { path: '/initial' },
      cache,
      loader: async ({ route }) => ({
        schemaVersion: '1.0',
        node: {
          componentName: 'Text',
          props: { children: route.path },
        },
        cache: { key: `screen:${route.path}` },
      }),
    })

    const slowLoad = store.load({ path: '/slow' })
    await Promise.resolve()
    expect(cache.set).toHaveBeenCalledWith(
      'screen:/slow',
      expect.objectContaining({
        node: expect.objectContaining({
          props: { children: '/slow' },
        }),
      }),
      expect.any(Object),
    )

    await expect(store.load({ path: '/fast' })).resolves.toMatchObject({
      status: 'success',
      route: { path: '/fast' },
    })

    cacheWrite.resolve()
    await expect(slowLoad).resolves.toMatchObject({
      status: 'success',
      route: { path: '/fast' },
    })
    expect(store.getState().response?.node).toEqual({
      componentName: 'Text',
      props: { children: '/fast' },
    })
  })

  it('passes screen id, route params, query, and state to screen loaders', async () => {
    const loader = vi.fn(async () => ({
      schemaVersion: '1.0',
      node: { componentName: 'Text' },
    }))
    const store = createScreenStore({
      route: { path: '/applications' },
      loader,
    })

    await store.setRoute({
      path: '/applications/42',
      screenId: 'applications.details',
      params: { id: '42' },
      query: { tab: 'summary' },
      state: { from: 'list' },
    })

    expect(loader).toHaveBeenCalledWith(
      expect.objectContaining({
        screenId: 'applications.details',
        route: {
          path: '/applications/42',
          screenId: 'applications.details',
          params: { id: '42' },
          query: { tab: 'summary' },
          state: { from: 'list' },
        },
      }),
      expect.any(Object),
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

  it('does not let stale screen load responses overwrite newer loads', async () => {
    const slow = deferred<SDUIScreenResponse>()
    const fast = deferred<SDUIScreenResponse>()
    const store = createScreenStore({
      route: { path: '/initial' },
      loader: ({ route }) => {
        return route.path === '/slow' ? slow.promise : fast.promise
      },
    })

    const slowLoad = store.load({ path: '/slow' })
    const fastLoad = store.load({ path: '/fast' })

    fast.resolve({
      schemaVersion: '1.0',
      node: { componentName: 'Text', props: { children: 'fast' } },
    })
    await expect(fastLoad).resolves.toMatchObject({
      status: 'success',
      route: { path: '/fast' },
    })

    slow.resolve({
      schemaVersion: '1.0',
      node: { componentName: 'Text', props: { children: 'slow' } },
    })
    await expect(slowLoad).resolves.toMatchObject({
      status: 'success',
      route: { path: '/fast' },
    })
    expect(store.getState().response?.node).toEqual({
      componentName: 'Text',
      props: { children: 'fast' },
    })
  })

  it('does not let stale screen load errors overwrite newer successes', async () => {
    const stale = deferred<SDUIScreenResponse>()
    const fresh = deferred<SDUIScreenResponse>()
    const store = createScreenStore({
      route: { path: '/initial' },
      loader: ({ route }) => {
        return route.path === '/stale' ? stale.promise : fresh.promise
      },
    })

    const staleLoad = store.load({ path: '/stale' })
    const freshLoad = store.load({ path: '/fresh' })

    fresh.resolve({
      schemaVersion: '1.0',
      node: { componentName: 'Text', props: { children: 'fresh' } },
    })
    await expect(freshLoad).resolves.toMatchObject({
      status: 'success',
      route: { path: '/fresh' },
    })

    stale.reject(new Error('Stale failed'))
    await expect(staleLoad).resolves.toMatchObject({
      status: 'success',
      route: { path: '/fresh' },
    })
    expect(store.getState().error).toBeUndefined()
    expect(store.getState().response?.node).toEqual({
      componentName: 'Text',
      props: { children: 'fresh' },
    })
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

  it('identifies SDUI nodes at runtime', () => {
    expect(isSDUINode({ componentName: 'Text' })).toBe(true)
    expect(isSDUINode({ componentName: '' })).toBe(true)
    expect(isSDUINode({ props: {} })).toBe(false)
    expect(isSDUINode(null)).toBe(false)
    expect(isSDUINode([{ componentName: 'Text' }])).toBe(false)
  })

  it('asserts valid nodes, screen responses, and route manifests', () => {
    expect(() =>
      assertValidSDUINode({ componentName: 'Text' }),
    ).not.toThrow()
    expect(() => assertValidSDUINode({ props: {} })).toThrow(
      'Invalid SDUI node: $.componentName: componentName must be a non-empty string',
    )

    expect(() =>
      assertValidSDUIScreenResponse({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
      }),
    ).not.toThrow()
    expect(() =>
      assertValidSDUIScreenResponse({ schemaVersion: '1.0' }),
    ).toThrow('Invalid SDUI screen response: $.node: node is required for render responses')

    expect(() =>
      assertValidSDUIRouteManifest({
        schemaVersion: '1.0',
        routes: [{ id: 'home', path: '/' }],
      }),
    ).not.toThrow()
    expect(() =>
      assertValidSDUIRouteManifest({ schemaVersion: '', routes: [] }),
    ).toThrow(
      'Invalid SDUI route manifest: $.schemaVersion: schemaVersion must be a non-empty string',
    )
  })

  it('detects renderable screen responses', () => {
    expect(
      isRenderableScreenResponse({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
      }),
    ).toBe(true)
    expect(
      isRenderableScreenResponse({
        schemaVersion: '1.0',
        status: 'notFound',
        node: { componentName: 'Missing' },
      }),
    ).toBe(true)
    expect(
      isRenderableScreenResponse({
        schemaVersion: '1.0',
        status: 'redirect',
        to: '/login',
      }),
    ).toBe(false)
    expect(
      isRenderableScreenResponse({
        schemaVersion: '1.0',
        status: 'notFound',
      }),
    ).toBe(false)
  })

  it('validates and collects nested SDUI nodes in arbitrary props', () => {
    const node = {
      componentName: 'Screen',
      props: {
        slots: {
          content: {
            componentName: 'UnknownPanel',
            props: {
              footer: {
                componentName: '',
              },
            },
          },
        },
      },
    }

    expect(validateSDUINode(node).issues).toContainEqual({
      path: '$.props.slots.content.props.footer.componentName',
      message: 'componentName must be a non-empty string',
    })
    expect(
      collectUnknownComponents(node, (componentName) => componentName === 'Screen'),
    ).toEqual(['UnknownPanel'])
  })

  it('does not collect components from action payload data', () => {
    const node = {
      componentName: 'Button',
      props: {
        action: {
          type: 'request',
          endpoint: '/api/save',
          params: {
            componentName: 'DomainFilter',
          },
          body: {
            metadata: {
              componentName: 'InvoiceDomain',
            },
          },
          payload: {
            componentName: 'DomainPayload',
          },
          success: {
            type: 'openModal',
            children: {
              componentName: 'UnknownDialog',
            },
          },
          error: {
            type: 'sequence',
            actions: [
              {
                type: 'drawerOpen',
                drawerId: 'details',
                payload: {
                  componentName: 'DrawerPayload',
                },
              },
              {
                type: 'openModal',
                children: [
                  { componentName: 'KnownText' },
                  { componentName: 'UnknownError' },
                ],
              },
            ],
          },
        },
      },
    }

    expect(
      collectUnknownComponents(
        node,
        (componentName) =>
          componentName === 'Button' || componentName === 'KnownText',
      ),
    ).toEqual(['UnknownDialog', 'UnknownError'])
  })

  it('validates nested actions with useful paths', () => {
    const result = validateSDUINode({
      componentName: 'Button',
      props: {
        action: {
          type: 'sequence',
          actions: [
            { type: 'toast' },
            {
              type: 'request',
              endpoint: '/api/save',
              success: { type: 'navigate' },
              error: { type: 'drawerOpen' },
            },
            { type: 'UI_ONLY', ui: { type: 'toast' } },
            { type: 'openModal', children: { props: {} } },
            { type: 'openModal' },
          ],
        },
      },
    })

    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          path: '$.props.action.actions[0].message',
          message: 'message must be a non-empty string',
        },
        {
          path: '$.props.action.actions[1].success.to',
          message: 'to must be a non-empty string',
        },
        {
          path: '$.props.action.actions[1].error.drawerId',
          message: 'drawerId must be a non-empty string',
        },
        {
          path: '$.props.action.actions[2].ui.message',
          message: 'message must be a non-empty string',
        },
        {
          path: '$.props.action.actions[3].children.componentName',
          message: 'componentName must be a non-empty string',
        },
        {
          path: '$.props.action.actions[4].children',
          message: 'children is required for openModal actions',
        },
      ]),
    )
  })

  it('validates route manifests', () => {
    expect(
      validateSDUIRouteManifest({
        schemaVersion: '1.0',
        routes: [
          {
            id: 'applications.list',
            path: '/applications',
            screenId: 'applications.list',
            title: 'Applications',
          },
          {
            id: 'applications.details',
            path: '/applications/:id',
            screenId: 'applications.details',
            params: {
              id: { type: 'string', required: true },
            },
            metadata: { permission: 'applications.read' },
            children: [
              {
                id: 'applications.details.documents',
                path: 'documents',
                screenId: 'applications.documents',
              },
            ],
          },
        ],
      }).valid,
    ).toBe(true)

    expect(
      validateSDUIRouteManifest({
        schemaVersion: '1.0',
        routes: [{ path: '' }],
      }).issues,
    ).toContainEqual({
      path: '$.routes[0].id',
      message: 'id must be a non-empty string',
    })
  })

  it('reports detailed route manifest issues', () => {
    expect(
      validateSDUIRouteManifest({
        schemaVersion: '',
        routes: [
          {
            id: 'details',
            path: '/details/:id',
            screenId: '',
            title: 123,
            params: {
              id: {
                type: 'uuid',
                required: 'yes',
                description: 42,
                metadata: 'invalid',
              },
              slug: 'bad',
            },
            metadata: null,
            children: [
              {
                id: '',
                path: '',
              },
            ],
          },
        ],
        metadata: 'invalid',
      }).issues,
    ).toEqual(
      expect.arrayContaining([
        {
          path: '$.schemaVersion',
          message: 'schemaVersion must be a non-empty string',
        },
        {
          path: '$.routes[0].screenId',
          message: 'screenId must be a non-empty string',
        },
        {
          path: '$.routes[0].title',
          message: 'title must be a string',
        },
        {
          path: '$.routes[0].params.id.type',
          message: 'type must be string, number, or boolean',
        },
        {
          path: '$.routes[0].params.id.required',
          message: 'required must be a boolean',
        },
        {
          path: '$.routes[0].params.id.description',
          message: 'description must be a string',
        },
        {
          path: '$.routes[0].params.id.metadata',
          message: 'metadata must be an object',
        },
        {
          path: '$.routes[0].params.slug',
          message: 'route params must be definition objects',
        },
        {
          path: '$.routes[0].metadata',
          message: 'metadata must be an object',
        },
        {
          path: '$.routes[0].children[0].id',
          message: 'id must be a non-empty string',
        },
        {
          path: '$.metadata',
          message: 'metadata must be an object',
        },
      ]),
    )
  })

  it('validates redirect and not found screen responses', () => {
    expect(
      validateSDUIScreenResponse({
        schemaVersion: '1.0',
        status: 'redirect',
        to: '/login',
        replace: true,
      }).valid,
    ).toBe(true)

    expect(
      validateSDUIScreenResponse({
        schemaVersion: '1.0',
        status: 'notFound',
        message: 'Missing screen',
      }).valid,
    ).toBe(true)

    expect(
      validateSDUIScreenResponse({
        schemaVersion: '1.0',
        status: 'redirect',
      }).issues,
    ).toContainEqual({
      path: '$.to',
      message: 'to must be a non-empty string for redirect responses',
    })

    expect(
      validateSDUIScreenResponse({
        schemaVersion: '1.0',
        status: null,
        node: { componentName: 'Text' },
      }).issues,
    ).toContainEqual({
      path: '$.status',
      message: 'status must be ok, redirect, or notFound when provided',
    })
  })

  it('reports detailed screen response issues', () => {
    expect(validateSDUIScreenResponse(null).issues).toEqual([
      { path: '$', message: 'Screen response must be an object' },
    ])
    expect(
      validateSDUIScreenResponse({
        schemaVersion: '1.0',
        status: 'redirect',
        to: '/login',
        query: 'bad',
        state: 'bad',
        replace: 'yes',
      }).issues,
    ).toEqual(
      expect.arrayContaining([
        { path: '$.query', message: 'query must be an object' },
        { path: '$.state', message: 'state must be an object' },
        { path: '$.replace', message: 'replace must be a boolean' },
      ]),
    )
    expect(
      validateSDUIScreenResponse({
        schemaVersion: '1.0',
        status: 'notFound',
        message: 404,
        node: { props: {} },
      }).issues,
    ).toEqual(
      expect.arrayContaining([
        { path: '$.message', message: 'message must be a string' },
        {
          path: '$.node.componentName',
          message: 'componentName must be a non-empty string',
        },
      ]),
    )
    expect(
      validateSDUIScreenResponse({
        schemaVersion: '1.0',
        node: { componentName: 'Text' },
        data: [],
        meta: [],
        cache: {
          key: 1,
          ttlMs: '1000',
          tags: 'Screen',
        },
      }).issues,
    ).toEqual(
      expect.arrayContaining([
        { path: '$.data', message: 'data must be an object' },
        { path: '$.meta', message: 'meta must be an object' },
        { path: '$.cache.key', message: 'key must be a string' },
        { path: '$.cache.ttlMs', message: 'ttlMs must be a number' },
        { path: '$.cache.tags', message: 'tags must be an array' },
      ]),
    )
  })

  it('collects unknown components from UI-only action children', () => {
    const node = {
      componentName: 'Button',
      props: {
        action: {
          type: 'UI_ONLY',
          ui: {
            type: 'openModal',
            children: {
              componentName: 'UnknownDialog',
            },
          },
        },
      },
    }

    expect(
      collectUnknownComponents(node, (componentName) => componentName === 'Button'),
    ).toEqual(['UnknownDialog'])
  })
})

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}
