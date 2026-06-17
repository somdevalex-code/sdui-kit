import { describe, expect, it, vi } from 'vitest'

import {
  createReactRouterCatchAllRoute,
  createReactRouterNavigationAdapter,
  createReactRouterRouteContext,
  createReactRouterRoutesFromManifest,
  withQuery,
} from '../src'

describe('@sdui-kit/react-router', () => {
  it('builds query strings', () => {
    expect(withQuery('/applications', { status: 'active', page: 2 })).toBe(
      '/applications?status=active&page=2',
    )
    expect(withQuery('/applications', {})).toBe('/applications')
    expect(
      withQuery('/applications?tab=summary#details', {
        tab: null,
        page: 2,
      }),
    ).toBe('/applications?tab=summary&page=2#details')
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

  it('builds route context from React Router location state', () => {
    expect(
      createReactRouterRouteContext({
        location: {
          pathname: '/applications/42',
          search: '?tab=summary',
          state: { from: 'list' },
        },
        params: { id: '42', ignored: undefined },
        screenId: 'applications.details',
      }),
    ).toEqual({
      path: '/applications/42',
      screenId: 'applications.details',
      params: { id: '42' },
      query: { tab: 'summary' },
      state: { from: 'list' },
    })
  })

  it('compacts empty route context params, search, and state', () => {
    expect(
      createReactRouterRouteContext({
        location: {
          pathname: '',
          search: '',
          state: ['not', 'an', 'object'],
        },
        params: { id: undefined },
      }),
    ).toEqual({ path: '/' })
  })

  it('creates catch-all and manifest route objects without router imports', () => {
    expect(
      createReactRouterCatchAllRoute({
        id: 'sdui',
        path: '/app/*',
        element: 'screen-boundary',
      }),
    ).toEqual({
      id: 'sdui',
      path: '/app/*',
      element: 'screen-boundary',
    })

    const element = vi.fn(() => 'screen-boundary')
    const routes = createReactRouterRoutesFromManifest(
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
      { element },
    )

    expect(routes).toEqual([
      {
        id: 'applications.details',
        path: '/applications/:id',
        element,
        handle: expect.objectContaining({
          routeId: 'applications.details',
          screenId: 'applications.details',
          title: 'Application',
        }),
      },
    ])
    expect(element).not.toHaveBeenCalled()
  })

  it('supports explicit per-route element factories', () => {
    expect(
      createReactRouterRoutesFromManifest(
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
          elementForRoute: (route) => `screen:${route.screenId}`,
        },
      ),
    ).toEqual([
      expect.objectContaining({
        element: 'screen:applications.details',
      }),
    ])
  })

  it('creates nested manifest routes and custom handles', () => {
    const routes = createReactRouterRoutesFromManifest(
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
        element: 'screen-boundary',
        handle: (route) => ({ customRouteId: route.id }),
      },
    )

    expect(routes).toEqual([
      expect.objectContaining({
        id: 'applications',
        element: 'screen-boundary',
        handle: expect.objectContaining({
          routeId: 'applications',
          customRouteId: 'applications',
        }),
        children: [
          expect.objectContaining({
            id: 'applications.details',
            path: ':id',
            element: 'screen-boundary',
            handle: expect.objectContaining({
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
})
