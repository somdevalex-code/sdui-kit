import { useMemo, useState } from 'react'
import {
  ActionRunner,
  createScreenStore,
  type NavigationAdapter,
  type RouteContext,
  type ScreenLoader,
  type SDUIScreenResponse,
} from '@sdui-kit/core'
import { SDUIScreenProvider, SDUIScreenRenderer } from '@sdui-kit/react'

import { createExampleRegistry } from './components'

export function App() {
  const [messages, setMessages] = useState<string[]>([])
  const registry = useMemo(() => createExampleRegistry(), [])
  const screenStore = useMemo(
    () =>
      createScreenStore({
        route: { path: '/applications' },
        loader: fakeScreenLoader,
      }),
    [],
  )
  const actionRunner = useMemo(
    () =>
      new ActionRunner({
        request: async (request) => {
          await new Promise((resolve) => setTimeout(resolve, 300))
          console.info('SDUI request executor received:', request)
          return { id: 'created' }
        },
        navigation: createExampleNavigation(screenStore.setRoute.bind(screenStore)),
        screen: screenStore,
        toast: (action) => {
          setMessages((current) => [action.message, ...current].slice(0, 3))
        },
      }),
    [screenStore],
  )

  return (
    <SDUIScreenProvider
      registry={registry}
      actionRunner={actionRunner}
      screenStore={screenStore}
    >
      <SDUIScreenRenderer
        loadingFallback={<main className="shell">Loading screen...</main>}
        errorFallback={(state) => (
          <main className="shell">
            Failed to load {state.route.path}
          </main>
        )}
      />
      <div className="toasts" aria-live="polite">
        {messages.map((message, index) => (
          <div className="toast" key={`${message}-${index}`}>
            {message}
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

const fakeScreenLoader: ScreenLoader = async ({ route }) => {
  await new Promise((resolve) => setTimeout(resolve, 250))

  if (route.path === '/applications/new') {
    return createFormScreen()
  }

  if (route.path.startsWith('/applications/')) {
    const segments = route.path.split('/')
    return createDetailsScreen(segments[segments.length - 1] ?? 'unknown')
  }

  return createListScreen()
}

function createListScreen(): SDUIScreenResponse {
  return {
    schemaVersion: '1.0',
    cache: {
      key: 'screen:/applications',
      tags: ['Applications'],
    },
    node: {
      schemaVersion: '1.0',
      componentName: 'shell',
      props: {
        children: [
          {
            componentName: 'heading',
            props: {
              children: 'Applications',
            },
          },
          {
            componentName: 'text',
            props: {
              tone: 'muted',
              children:
                'This screen is loaded through a framework-agnostic SDUI screen loader.',
            },
          },
          {
            componentName: 'button',
            props: {
              children: 'New application',
              action: {
                type: 'navigate',
                to: '/applications/new',
              },
            },
          },
          {
            componentName: 'button',
            props: {
              children: 'Refresh screen',
              action: {
                type: 'refreshScreen',
              },
            },
          },
          {
            componentName: 'text',
            props: {
              children: 'Recent applications',
            },
          },
          ...['101', '102', '103'].map((id) => ({
            componentName: 'button',
            props: {
              children: `Open application ${id}`,
              action: {
                type: 'navigate',
                to: `/applications/${id}`,
              },
            },
          })),
        ],
      },
    },
  }
}

function createDetailsScreen(id: string): SDUIScreenResponse {
  return {
    schemaVersion: '1.0',
    cache: {
      key: `screen:/applications/${id}`,
      tags: [{ type: 'Application', id }],
    },
    data: {
      applicationId: id,
    },
    node: {
      schemaVersion: '1.0',
      componentName: 'shell',
      props: {
        children: [
          {
            componentName: 'heading',
            props: {
              children: `Application ${id}`,
            },
          },
          {
            componentName: 'text',
            props: {
              tone: 'muted',
              children: 'Details payload was selected by route context.',
            },
          },
          {
            componentName: 'button',
            props: {
              children: 'Back to list',
              action: {
                type: 'navigate',
                to: '/applications',
              },
            },
          },
        ],
      },
    },
  }
}

function createFormScreen(): SDUIScreenResponse {
  return {
    schemaVersion: '1.0',
    node: {
      schemaVersion: '1.0',
      componentName: 'shell',
      props: {
        children: [
          {
            componentName: 'heading',
            props: {
              children: 'Application intake',
            },
          },
          {
            componentName: 'text',
            props: {
              tone: 'muted',
              children:
                'The form definition, validation rules, and submit action are server-driven.',
            },
          },
          {
            componentName: 'form',
            props: {
              definition: {
                id: 'applicationForm',
                initialValues: {
                  applicantType: 'person',
                  fullName: '',
                  companyName: '',
                },
                fields: [
                  {
                    name: 'applicantType',
                    validation: { required: true },
                  },
                  {
                    name: 'fullName',
                    validation: { required: 'Full name is required' },
                  },
                  {
                    name: 'companyName',
                    visibleWhen: {
                      eq: [{ var: 'form.values.applicantType' }, 'company'],
                    },
                    validation: { required: 'Company name is required' },
                  },
                ],
                onSubmit: {
                  type: 'request',
                  endpoint: '/api/applications',
                  method: 'POST',
                  body: { $from: 'form.values' },
                  invalidate: ['Applications'],
                  success: {
                    type: 'sequence',
                    actions: [
                      {
                        type: 'toast',
                        message: 'Application submitted',
                        status: 'success',
                      },
                      {
                        type: 'navigate',
                        to: '/applications/created',
                      },
                    ],
                  },
                },
              },
              children: [
                {
                  componentName: 'selectField',
                  props: {
                    name: 'applicantType',
                    label: 'Applicant type',
                    options: [
                      { label: 'Person', value: 'person' },
                      { label: 'Company', value: 'company' },
                    ],
                  },
                },
                {
                  componentName: 'textField',
                  props: {
                    name: 'fullName',
                    label: 'Full name',
                    placeholder: 'Ada Lovelace',
                  },
                },
                {
                  componentName: 'textField',
                  props: {
                    name: 'companyName',
                    label: 'Company name',
                    placeholder: 'Analytical Engines Ltd',
                  },
                },
                {
                  componentName: 'button',
                  props: {
                    kind: 'submit',
                    children: 'Submit application',
                  },
                },
                {
                  componentName: 'button',
                  props: {
                    children: 'Cancel',
                    action: {
                      type: 'navigate',
                      to: '/applications',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
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
