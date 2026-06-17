import { describe, expect, it } from 'vitest'

import {
  createTanStackCatchAllRouteOptions,
  createTanStackRouteContext,
  createTanStackRoutesFromManifest,
  toTanStackRoutePath,
} from '../src'

describe('@sdui-kit/tanstack-router', () => {
  it('builds route context from TanStack Router state', () => {
    expect(
      createTanStackRouteContext({
        pathname: '/applications/42',
        params: { id: '42', ignored: undefined },
        search: { tab: 'summary', page: 2, tag: ['a', 'b'] },
        state: { from: 'list' },
        screenId: 'applications.details',
      }),
    ).toEqual({
      path: '/applications/42',
      screenId: 'applications.details',
      params: { id: '42' },
      query: { tab: 'summary', page: '2', tag: 'b' },
      state: { from: 'list' },
    })
  })

  it('normalizes empty route context values and forEach search params', () => {
    expect(
      createTanStackRouteContext({
        pathname: '',
        params: { id: undefined },
        search: { tag: [], skipped: null },
        state: ['not', 'an', 'object'],
      }),
    ).toEqual({ path: '/' })

    expect(
      createTanStackRouteContext({
        pathname: '/applications',
        search: new URLSearchParams('tab=summary'),
      }).query,
    ).toEqual({ tab: 'summary' })

    expect(
      createTanStackRouteContext({
        pathname: '/applications',
        search: {
          forEach(callback) {
            callback('2', 'page')
          },
        },
      }).query,
    ).toEqual({ page: '2' })
  })

  it('creates catch-all route options and manifest route options', () => {
    expect(
      createTanStackCatchAllRouteOptions({
        id: 'sdui',
        component: 'screen-boundary',
      }),
    ).toEqual({
      id: 'sdui',
      path: '$',
      component: 'screen-boundary',
    })

    const component = () => 'screen-boundary'
    const loader = () => ({ ok: true })

    const routes = createTanStackRoutesFromManifest(
      {
        schemaVersion: '1.0',
        routes: [
          {
            id: 'applications.details',
            path: '/applications/:id',
            screenId: 'applications.details',
            title: 'Application',
          },
        ],
      },
      { component, loader },
    )

    expect(routes).toEqual([
      {
        path: '/applications/$id',
        component,
        loader,
        staticData: expect.objectContaining({
          routeId: 'applications.details',
          screenId: 'applications.details',
          title: 'Application',
        }),
      },
    ])
    expect(routes[0]).not.toHaveProperty('id')
  })

  it('supports explicit per-route option factories', () => {
    expect(
      createTanStackRoutesFromManifest(
        {
          schemaVersion: '1.0',
          routes: [
            {
              id: 'applications.details',
              path: '/applications/:id',
              screenId: 'applications.details',
            },
          ],
        },
        {
          componentForRoute: (route) => `component:${route.id}`,
          loaderForRoute: (route) => `loader:${route.screenId}`,
        },
      ),
    ).toEqual([
      expect.objectContaining({
        component: 'component:applications.details',
        loader: 'loader:applications.details',
      }),
    ])
  })

  it('creates nested manifest routes with static data and beforeLoad factories', () => {
    const beforeLoad = () => ({ ok: true })
    const routes = createTanStackRoutesFromManifest(
      {
        schemaVersion: '1.0',
        routes: [
          {
            id: 'applications',
            path: '/applications',
            screenId: 'applications.list',
            children: [
              {
                id: 'applications.details',
                path: ':id',
                screenId: 'applications.details',
                metadata: { permission: 'applications.read' },
              },
            ],
          },
        ],
      },
      {
        componentForRoute: (route) => `component:${route.id}`,
        beforeLoadForRoute: () => beforeLoad,
        staticData: (route) => ({ customRouteId: route.id }),
      },
    )

    expect(routes).toEqual([
      expect.objectContaining({
        path: '/applications',
        component: 'component:applications',
        beforeLoad,
        staticData: expect.objectContaining({
          routeId: 'applications',
          customRouteId: 'applications',
        }),
        children: [
          expect.objectContaining({
            path: '$id',
            component: 'component:applications.details',
            beforeLoad,
            staticData: expect.objectContaining({
              routeId: 'applications.details',
              screenId: 'applications.details',
              metadata: { permission: 'applications.read' },
              customRouteId: 'applications.details',
            }),
          }),
        ],
      }),
    ])
  })

  it('converts neutral route params to TanStack route params', () => {
    expect(toTanStackRoutePath('/applications/:id/documents/:documentId')).toBe(
      '/applications/$id/documents/$documentId',
    )
    expect(toTanStackRoutePath('/users/:id?')).toBe('/users/{-$id}')
    expect(toTanStackRoutePath('/:locale?/docs/:id')).toBe(
      '/{-$locale}/docs/$id',
    )
  })
})
