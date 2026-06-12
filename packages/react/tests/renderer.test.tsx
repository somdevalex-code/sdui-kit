import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ActionRunner } from '@sdui-kit/core'

import { SDUIProvider, SDUIRenderer, createReactRegistry } from '../src'

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
})
