import { describe, expect, it, vi } from 'vitest'

import {
  createVueRouterCatchAllRoute,
  createVueRouterLocation,
  createVueRouterNavigationAdapter,
  createVueRouterRouteContext,
  createVueRouterRoutesFromManifest,
} from '../src'

describe('@sdui-kit/vue-router', () => {
  it('delegates navigation actions to Vue Router push and replace', () => {
    const router = {
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
    }
    const onNavigate = vi.fn()
    const adapter = createVueRouterNavigationAdapter({ router, onNavigate })

    adapter.navigate(
      {
        type: 'navigate',
        to: '/applications/42?tab=old#summary',
        query: { tab: 'documents', filter: undefined },
        state: { from: 'list' },
      },
      {},
    )
    adapter.navigate(
      {
        type: 'navigate',
        to: '/applications',
        replace: true,
      },
      {},
    )
    adapter.goBack({})

    expect(router.push).toHaveBeenCalledWith({
      path: '/applications/42',
      query: { tab: 'documents' },
      hash: '#summary',
      state: { from: 'list' },
    })
    expect(router.replace).toHaveBeenCalledWith({
      path: '/applications',
    })
    expect(router.back).toHaveBeenCalled()
    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/applications/42' }),
      expect.objectContaining({ type: 'navigate' }),
    )
  })

  it('waits for Vue Router navigation promises', async () => {
    let completeNavigation: () => void = () => undefined
    const navigation = new Promise<void>((resolve) => {
      completeNavigation = resolve
    })
    const router = {
      push: vi.fn(() => navigation),
      replace: vi.fn(),
      back: vi.fn(),
    }
    const adapter = createVueRouterNavigationAdapter({ router })
    const result = adapter.navigate(
      {
        type: 'navigate',
        to: '/applications/42',
      },
      {},
    ) as Promise<void>
    let completed = false

    result.then(() => {
      completed = true
    })
    await Promise.resolve()

    expect(completed).toBe(false)

    completeNavigation()
    await result

    expect(completed).toBe(true)
  })

  it('propagates Vue Router navigation failures', async () => {
    const error = new Error('Navigation failed')
    const router = {
      push: vi.fn(),
      replace: vi.fn(() => Promise.reject(error)),
      back: vi.fn(),
    }
    const adapter = createVueRouterNavigationAdapter({ router })

    await expect(
      adapter.navigate(
        {
          type: 'navigate',
          to: '/applications',
          replace: true,
        },
        {},
      ),
    ).rejects.toThrow(error)
  })

  it('builds Vue Router locations from navigation actions', () => {
    expect(
      createVueRouterLocation({
        type: 'navigate',
        to: '/search?q=ada',
        query: { page: 2, empty: null },
      }),
    ).toEqual({
      path: '/search',
      query: { q: 'ada', page: '2' },
    })
  })

  it('builds route context from Vue Router route-like objects', () => {
    expect(
      createVueRouterRouteContext({
        route: {
          path: '/applications/42',
          params: { id: '42', rest: ['documents', 'passport'] },
          query: {
            tab: 'summary',
            duplicate: ['old', null, 'new', null],
            empty: [null],
          },
          state: { from: 'list' },
        },
        screenId: 'applications.details',
      }),
    ).toEqual({
      path: '/applications/42',
      screenId: 'applications.details',
      params: { id: '42', rest: 'documents/passport' },
      query: { tab: 'summary', duplicate: 'new' },
      state: { from: 'list' },
    })
  })

  it('falls back to fullPath and compacts empty route context values', () => {
    expect(
      createVueRouterRouteContext({
        route: {
          fullPath: '/from-full-path?tab=summary#details',
          params: {
            id: null,
            rest: [null],
          },
          query: {
            empty: [null],
            skipped: undefined,
          },
          state: 'not-an-object',
        },
      }),
    ).toEqual({
      path: '/from-full-path',
    })

    expect(createVueRouterRouteContext({ route: {} })).toEqual({ path: '/' })
  })

  it('creates catch-all route records', () => {
    expect(
      createVueRouterCatchAllRoute({
        name: 'sdui.catchAll',
        component: 'SDUIRouteBoundary',
      }),
    ).toEqual({
      path: '/:pathMatch(.*)*',
      name: 'sdui.catchAll',
      component: 'SDUIRouteBoundary',
    })
  })

  it('creates Vue Router route records from an SDUI manifest', () => {
    const routes = createVueRouterRoutesFromManifest(
      {
        schemaVersion: '1.0',
        routes: [
          {
            id: 'applications.list',
            path: '/applications',
            screenId: 'applications.list',
            title: 'Applications',
            children: [
              {
                id: 'applications.details',
                path: ':id',
                screenId: 'applications.details',
                metadata: { auth: true },
              },
            ],
          },
        ],
      },
      {
        component: 'SDUIRouteBoundary',
        meta: (route) => ({ requiresAuth: route.metadata?.auth === true }),
      },
    )

    expect(routes).toEqual([
      {
        path: '/applications',
        name: 'applications.list',
        component: 'SDUIRouteBoundary',
        meta: {
          routeId: 'applications.list',
          screenId: 'applications.list',
          title: 'Applications',
          sduiRoute: expect.objectContaining({
            id: 'applications.list',
          }),
          requiresAuth: false,
        },
        children: [
          {
            path: ':id',
            name: 'applications.details',
            component: 'SDUIRouteBoundary',
            meta: {
              routeId: 'applications.details',
              screenId: 'applications.details',
              metadata: { auth: true },
              sduiRoute: expect.objectContaining({
                id: 'applications.details',
              }),
              requiresAuth: true,
            },
          },
        ],
      },
    ])
  })

  it('uses manifest route factory overrides', () => {
    const beforeEnter = vi.fn()
    const routes = createVueRouterRoutesFromManifest(
      {
        schemaVersion: '1.0',
        routes: [
          {
            id: 'applications.details',
            path: '/applications/:id',
            screenId: 'applications.details',
            metadata: { auth: true },
          },
        ],
      },
      {
        component: 'DefaultBoundary',
        components: { default: 'DefaultBoundary' },
        redirect: '/default',
        beforeEnter: 'defaultGuard',
        componentForRoute: (route) => `Component:${route.id}`,
        componentsForRoute: (route) => ({ sidebar: `Sidebar:${route.id}` }),
        redirectForRoute: (route) => `/redirected/${route.id}`,
        beforeEnterForRoute: () => beforeEnter,
        meta: (route) => ({ requiresAuth: route.metadata?.auth === true }),
      },
    )

    expect(routes).toEqual([
      {
        path: '/applications/:id',
        name: 'applications.details',
        component: 'Component:applications.details',
        components: { sidebar: 'Sidebar:applications.details' },
        redirect: '/redirected/applications.details',
        beforeEnter,
        meta: expect.objectContaining({
          routeId: 'applications.details',
          screenId: 'applications.details',
          metadata: { auth: true },
          requiresAuth: true,
        }),
      },
    ])
  })
})
