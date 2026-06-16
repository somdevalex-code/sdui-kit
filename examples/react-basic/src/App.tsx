import { useMemo, useState } from 'react'
import {
  ActionRunner,
  createScreenStore,
  isRecord,
  type NavigationAdapter,
  type RouteContext,
  type RuntimeContext,
  type ToastAction,
} from '@sdui-kit/core'
import { SDUIScreenProvider, SDUIScreenRenderer } from '@sdui-kit/react'

import { LoadingState } from './components/primitives'
import { createDemoBackend } from './demoBackend'
import { createExampleRegistry } from './registry'

type ToastMessage = {
  id: number
  message: string
  status: NonNullable<ToastAction['status']>
}

let nextToastId = 1

export function App() {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  const registry = useMemo(() => createExampleRegistry(), [])
  const backend = useMemo(() => createDemoBackend(), [])
  const screenStore = useMemo(
    () =>
      createScreenStore({
        route: { path: '/applications' },
        loader: backend.loadScreen,
      }),
    [backend],
  )
  const actionRunner = useMemo(
    () =>
      new ActionRunner({
        request: backend.handleRequest,
        navigation: createExampleNavigation(screenStore.setRoute.bind(screenStore)),
        screen: screenStore,
        toast: (action) => {
          setMessages((current) =>
            [
              {
                id: nextToastId++,
                message: action.message,
                status: action.status ?? 'info',
              },
              ...current,
            ].slice(0, 3),
          )
        },
        custom: {
          navigateToCreatedApplication: async (_action, context) => {
            await screenStore.setRoute({
              path: `/applications/${readCreatedApplicationId(context)}`,
            })
          },
        },
      }),
    [backend, screenStore],
  )

  return (
    <SDUIScreenProvider
      registry={registry}
      actionRunner={actionRunner}
      screenStore={screenStore}
    >
      <SDUIScreenRenderer
        loadingFallback={<LoadingState />}
        errorFallback={(state) => (
          <main className="app-shell app-shell--fallback">
            <div className="error-state">
              Failed to load {state.route.path}
            </div>
          </main>
        )}
      />
      <div className="toasts" aria-live="polite">
        {messages.map((message) => (
          <div
            className={`toast toast--${message.status}`}
            key={message.id}
          >
            {message.message}
          </div>
        ))}
      </div>
    </SDUIScreenProvider>
  )
}

function createExampleNavigation(
  setRoute: (route: RouteContext) => Promise<unknown>,
): NavigationAdapter {
  return {
    navigate: async (action) => {
      await setRoute(toRoute(action.to, action.query, action.state))
    },
    goBack: async () => {
      await setRoute({ path: '/applications' })
    },
  }
}

function toRoute(
  to: string,
  query?: Record<string, unknown>,
  state?: Record<string, unknown>,
): RouteContext {
  const url = new URL(to, 'http://sdui.local')

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value != null) {
      url.searchParams.set(key, String(value))
    }
  })

  return {
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    state,
  }
}

function readCreatedApplicationId(context: RuntimeContext): string {
  const response = context.response

  if (isRecord(response) && typeof response.id === 'string') {
    return response.id
  }

  if (
    isRecord(response) &&
    isRecord(response.application) &&
    typeof response.application.id === 'string'
  ) {
    return response.application.id
  }

  throw new Error('Create application response did not include an id')
}
