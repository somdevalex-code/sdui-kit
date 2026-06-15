import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ActionRunner, type ScreenStoreAdapter } from '@sdui-kit/core'

import {
  SDUIProvider,
  SDUIRenderer,
  SDUIScreenProvider,
  SDUIScreenRenderer,
  createReactRegistry,
} from '../src'

describe('@sdui-kit/react', () => {
  it('supports JavaScript shorthand component maps', () => {
    const Text = ({ children }: { children?: React.ReactNode }) =>
      React.createElement('p', null, children)
    const Button = ({ children }: { children?: React.ReactNode }) =>
      React.createElement('button', null, children)
    const registry = createReactRegistry({
      Text,
      Button,
    })

    const html = renderToStaticMarkup(
      <SDUIProvider registry={registry} actionRunner={new ActionRunner()}>
        <SDUIRenderer
          node={[
            {
              componentName: 'Text',
              props: { children: 'Hello' },
            },
            {
              componentName: 'Button',
              props: { children: 'Save' },
            },
          ]}
        />
      </SDUIProvider>,
    )

    expect(html).toContain('<p>Hello</p>')
    expect(html).toContain('<button>Save</button>')
  })

  it('supports direct component maps without injecting SDUI internals', () => {
    let receivedProps: Record<string, unknown> = {}
    const Badge = (props: Record<string, unknown>) => {
      receivedProps = props
      return React.createElement('div', null, String(props.label))
    }
    const registry = createReactRegistry({
      badge: Badge,
    })

    renderToStaticMarkup(
      <SDUIProvider registry={registry} actionRunner={new ActionRunner()}>
        <SDUIRenderer
          node={{
            componentName: 'badge',
            props: {
              label: 'Active applications',
              tone: 'success',
            },
          }}
        />
      </SDUIProvider>,
    )

    expect(receivedProps).toMatchObject({
      label: 'Active applications',
      tone: 'success',
    })
    expect(receivedProps).not.toHaveProperty('action')
    expect(receivedProps).not.toHaveProperty('componentName')
    expect(receivedProps).not.toHaveProperty('sduiNode')
    expect(receivedProps).not.toHaveProperty('runAction')
    expect(receivedProps).not.toHaveProperty('renderNode')
  })

  it('passes arbitrary props from SDUI payload into registered components', () => {
    const registry = createReactRegistry({
      badge: ({ label, tone, count }) =>
        React.createElement(
          'div',
          {
            'data-tone': String(tone),
            'data-count': String(count),
          },
          label,
        ),
    })

    const html = renderToStaticMarkup(
      <SDUIProvider registry={registry} actionRunner={new ActionRunner()}>
        <SDUIRenderer
          node={{
            componentName: 'badge',
            props: {
              label: 'Active applications',
              tone: 'success',
              count: 12,
            },
          }}
        />
      </SDUIProvider>,
    )

    expect(html).toContain('data-tone="success"')
    expect(html).toContain('data-count="12"')
    expect(html).toContain('Active applications')
  })

  it('renders registered components and nested children', () => {
    const registry = createReactRegistry({
      text: ({ children }) => React.createElement('span', null, children),
      stack: ({ children }) => React.createElement('section', null, children),
    })

    const html = renderToStaticMarkup(
      <SDUIProvider registry={registry} actionRunner={new ActionRunner()}>
        <SDUIRenderer
          node={{
            componentName: 'stack',
            props: {
              children: [
                {
                  componentName: 'text',
                  props: { children: 'Hello SDUI' },
                },
              ],
            },
          }}
        />
      </SDUIProvider>,
    )

    expect(html).toContain('<section>')
    expect(html).toContain('Hello SDUI')
  })

  it('renders loaded screens through the screen renderer', () => {
    const registry = createReactRegistry({
      Text: ({ children }) => React.createElement('p', null, children),
    })
    const store = createStaticScreenStore({
      status: 'success',
      route: { path: '/applications' },
      response: {
        schemaVersion: '1.0',
        node: {
          componentName: 'Text',
          props: { children: 'Remote screen' },
        },
      },
    })

    const html = renderToStaticMarkup(
      <SDUIScreenProvider
        registry={registry}
        actionRunner={new ActionRunner()}
        screenStore={store}
      >
        <SDUIScreenRenderer />
      </SDUIScreenProvider>,
    )

    expect(html).toContain('Remote screen')
  })

  it('renders screen loading and error fallbacks', () => {
    const registry = createReactRegistry({})
    const loading = renderToStaticMarkup(
      <SDUIScreenProvider
        registry={registry}
        actionRunner={new ActionRunner()}
        screenStore={createStaticScreenStore({
          status: 'loading',
          route: { path: '/loading' },
        })}
      >
        <SDUIScreenRenderer loadingFallback="Loading..." />
      </SDUIScreenProvider>,
    )
    const error = renderToStaticMarkup(
      <SDUIScreenProvider
        registry={registry}
        actionRunner={new ActionRunner()}
        screenStore={createStaticScreenStore({
          status: 'error',
          route: { path: '/error' },
          error: new Error('No screen'),
        })}
      >
        <SDUIScreenRenderer errorFallback={(state) => `Failed ${state.route.path}`} />
      </SDUIScreenProvider>,
    )

    expect(loading).toContain('Loading...')
    expect(error).toContain('Failed /error')
  })

  it('renders loading and error fallbacks after non-renderable responses', () => {
    const registry = createReactRegistry({})
    const loading = renderToStaticMarkup(
      <SDUIScreenProvider
        registry={registry}
        actionRunner={new ActionRunner()}
        screenStore={createStaticScreenStore({
          status: 'loading',
          route: { path: '/next' },
          response: {
            schemaVersion: '1.0',
            status: 'redirect',
            to: '/login',
          },
        })}
      >
        <SDUIScreenRenderer
          loadingFallback="Loading next screen"
          emptyFallback="Empty"
        />
      </SDUIScreenProvider>,
    )
    const error = renderToStaticMarkup(
      <SDUIScreenProvider
        registry={registry}
        actionRunner={new ActionRunner()}
        screenStore={createStaticScreenStore({
          status: 'error',
          route: { path: '/missing' },
          response: {
            schemaVersion: '1.0',
            status: 'notFound',
          },
          error: new Error('No screen'),
        })}
      >
        <SDUIScreenRenderer
          errorFallback={(state) => `Failed ${state.route.path}`}
          emptyFallback="Empty"
        />
      </SDUIScreenProvider>,
    )

    expect(loading).toContain('Loading next screen')
    expect(loading).not.toContain('Empty')
    expect(error).toContain('Failed /missing')
    expect(error).not.toContain('Empty')
  })

  it('passes screen route and data into action context', async () => {
    let buttonProps: Record<string, unknown> = {}
    const custom = vi.fn()
    const registry = createReactRegistry({
      Button: (props: Record<string, unknown>) => {
        buttonProps = props
        return React.createElement('button', null, props.children as React.ReactNode)
      },
    })
    const store = createStaticScreenStore({
      status: 'success',
      route: { path: '/applications/101' },
      response: {
        schemaVersion: '1.0',
        data: { applicationId: '101' },
        node: {
          componentName: 'Button',
          props: {
            children: 'Inspect',
            action: { type: 'inspect' },
          },
        },
      },
    })

    renderToStaticMarkup(
      <SDUIScreenProvider
        registry={registry}
        actionRunner={new ActionRunner({ custom: { inspect: custom } })}
        screenStore={store}
      >
        <SDUIScreenRenderer />
      </SDUIScreenProvider>,
    )

    await (buttonProps.onClick as () => Promise<unknown>)()

    expect(custom).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'inspect' }),
      expect.objectContaining({
        route: { path: '/applications/101' },
        data: { applicationId: '101' },
      }),
      expect.any(ActionRunner),
    )
  })
})

function createStaticScreenStore(
  state: ReturnType<ScreenStoreAdapter['getState']>,
): ScreenStoreAdapter {
  return {
    getState: () => state,
    subscribe: (listener) => {
      listener(state)
      return () => undefined
    },
    load: async () => state,
    refresh: async () => state,
    setRoute: async () => state,
  }
}
