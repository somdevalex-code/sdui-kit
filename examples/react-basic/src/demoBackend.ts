import type { ActionAdapters, ScreenLoader } from '@sdui-kit/core'

import {
  createDemoApplicationStore,
  readCreateApplicationInput,
} from './demoData'
import {
  createApplicationDetailsScreen,
  createApplicationFormScreen,
  createApplicationsListScreen,
  createRouteNotFoundScreen,
} from './screens'

type DemoApplicationStore = ReturnType<typeof createDemoApplicationStore>

export interface DemoBackend {
  loadScreen: ScreenLoader
  handleRequest: NonNullable<ActionAdapters['request']>
}

export function createDemoBackend(
  store: DemoApplicationStore = createDemoApplicationStore(),
): DemoBackend {
  return {
    loadScreen: async ({ route }) => {
      await delay(250)

      const parsedRoute = parseApplicationRoute(route.path)

      switch (parsedRoute.type) {
        case 'list':
          return createApplicationsListScreen(store.listApplications())
        case 'new':
          return createApplicationFormScreen()
        case 'details':
          return createApplicationDetailsScreen(
            parsedRoute.id,
            store.getApplication(parsedRoute.id),
          )
        case 'unknown':
          return createRouteNotFoundScreen(route.path)
      }
    },

    handleRequest: async (request) => {
      await delay(300)

      if (
        request.endpoint === '/api/applications' &&
        (request.method ?? 'POST') === 'POST'
      ) {
        const application = store.createApplication(
          readCreateApplicationInput(request.body),
        )

        return {
          id: application.id,
          application,
        }
      }

      throw new Error(
        `No fake backend handler for ${request.method} ${request.endpoint}`,
      )
    },
  }
}

function parseApplicationRoute(path: string):
  | { type: 'list' }
  | { type: 'new' }
  | { type: 'details'; id: string }
  | { type: 'unknown' } {
  if (path === '/' || path === '/applications') {
    return { type: 'list' }
  }

  if (path === '/applications/new') {
    return { type: 'new' }
  }

  const detailsMatch = /^\/applications\/([^/]+)$/.exec(path)

  if (detailsMatch?.[1]) {
    return { type: 'details', id: decodeURIComponent(detailsMatch[1]) }
  }

  return { type: 'unknown' }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
