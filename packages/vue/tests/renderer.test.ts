import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ActionRunner, type ScreenStoreAdapter } from '@sdui-kit/core'

import {
  SDUIProvider,
  SDUIRenderer,
  SDUIScreenProvider,
  SDUIScreenRenderer,
  createVueRegistry,
} from '../src'

describe('@sdui-kit/vue', () => {
  it('supports JavaScript shorthand component maps', async () => {
    const Text = defineComponent({
      setup(_props, { slots }) {
        return () => h('p', null, slots.default?.())
      },
    })
    const Button = defineComponent({
      setup(_props, { slots }) {
        return () => h('button', null, slots.default?.())
      },
    })
    const registry = createVueRegistry({
      Text,
      Button,
    })

    const html = await renderVue(
      h(
        SDUIProvider,
        { registry, actionRunner: new ActionRunner() },
        {
          default: () =>
            h(SDUIRenderer, {
              node: [
                {
                  componentName: 'Text',
                  props: { children: 'Hello' },
                },
                {
                  componentName: 'Button',
                  props: { children: 'Save' },
                },
              ],
            }),
        },
      ),
    )

    expect(html).toContain('<p>Hello</p>')
    expect(html).toContain('<button>Save</button>')
  })

  it('supports direct component maps without injecting SDUI internals', async () => {
    let receivedProps: Record<string, unknown> = {}
    const Badge = defineComponent({
      inheritAttrs: false,
      setup(_props, { attrs }) {
        receivedProps = attrs
        return () => h('div', null, String(attrs.label))
      },
    })
    const registry = createVueRegistry({
      badge: Badge,
    })

    await renderVue(
      h(
        SDUIProvider,
        { registry, actionRunner: new ActionRunner() },
        {
          default: () =>
            h(SDUIRenderer, {
              node: {
                componentName: 'badge',
                props: {
                  label: 'Active applications',
                  tone: 'success',
                },
              },
            }),
        },
      ),
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

  it('renders registered components and nested children as slots', async () => {
    const registry = createVueRegistry({
      text: defineComponent({
        setup(_props, { slots }) {
          return () => h('span', null, slots.default?.())
        },
      }),
      stack: defineComponent({
        setup(_props, { slots }) {
          return () => h('section', null, slots.default?.())
        },
      }),
    })

    const html = await renderVue(
      h(
        SDUIProvider,
        { registry, actionRunner: new ActionRunner() },
        {
          default: () =>
            h(SDUIRenderer, {
              node: {
                componentName: 'stack',
                props: {
                  children: [
                    {
                      componentName: 'text',
                      props: { children: 'Hello SDUI' },
                    },
                  ],
                },
              },
            }),
        },
      ),
    )

    expect(html).toContain('<section>')
    expect(html).toContain('Hello SDUI')
  })

  it('does not create default slots for childless components', async () => {
    const registry = createVueRegistry({
      OptionalSlot: defineComponent({
        setup(_props, { slots }) {
          return () =>
            h(
              'div',
              null,
              slots.default
                ? ['has slot', h('section', null, slots.default())]
                : 'no slot',
            )
        },
      }),
    })

    const html = await renderVue(
      h(
        SDUIProvider,
        { registry, actionRunner: new ActionRunner() },
        {
          default: () =>
            h(SDUIRenderer, {
              node: {
                componentName: 'OptionalSlot',
                props: {},
              },
            }),
        },
      ),
    )

    expect(html).toContain('no slot')
    expect(html).not.toContain('has slot')
    expect(html).not.toContain('<section>')
  })

  it('renders unknown components through the fallback component', async () => {
    const registry = createVueRegistry({})

    const html = await renderVue(
      h(
        SDUIProvider,
        { registry, actionRunner: new ActionRunner() },
        {
          default: () =>
            h(SDUIRenderer, {
              node: {
                componentName: 'MissingWidget',
                props: {},
              },
            }),
        },
      ),
    )

    expect(html).toContain('data-sdui-missing-component')
    expect(html).toContain('Unknown SDUI component: MissingWidget')
  })

  it('injects runtime props only when registration metadata opts in', async () => {
    let receivedProps: Record<string, unknown> = {}
    const RuntimeWidget = defineComponent({
      inheritAttrs: false,
      setup(_props, { attrs }) {
        receivedProps = attrs
        return () => h('div', null, String(attrs.componentName))
      },
    })
    const registry = createVueRegistry({
      RuntimeWidget: {
        component: RuntimeWidget,
        metadata: { injectRuntime: true },
      },
    })

    const html = await renderVue(
      h(
        SDUIProvider,
        { registry, actionRunner: new ActionRunner() },
        {
          default: () =>
            h(SDUIRenderer, {
              node: {
                componentName: 'RuntimeWidget',
                props: { label: 'Advanced' },
              },
            }),
        },
      ),
    )

    expect(html).toContain('RuntimeWidget')
    expect(receivedProps).toMatchObject({
      componentName: 'RuntimeWidget',
      label: 'Advanced',
    })
    expect(receivedProps.sduiNode).toMatchObject({
      componentName: 'RuntimeWidget',
    })
    expect(receivedProps.runAction).toEqual(expect.any(Function))
    expect(receivedProps.renderNode).toEqual(expect.any(Function))
  })

  it('renders loaded screens through the screen renderer', async () => {
    const registry = createVueRegistry({
      Text: defineComponent({
        setup(_props, { slots }) {
          return () => h('p', null, slots.default?.())
        },
      }),
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

    const html = await renderVue(
      h(
        SDUIScreenProvider,
        {
          registry,
          actionRunner: new ActionRunner(),
          screenStore: store,
        },
        {
          default: () => h(SDUIScreenRenderer),
        },
      ),
    )

    expect(html).toContain('Remote screen')
  })

  it('renders screen loading and error fallbacks', async () => {
    const registry = createVueRegistry({})
    const loading = await renderVue(
      h(
        SDUIScreenProvider,
        {
          registry,
          actionRunner: new ActionRunner(),
          screenStore: createStaticScreenStore({
            status: 'loading',
            route: { path: '/loading' },
          }),
        },
        {
          default: () =>
            h(SDUIScreenRenderer, { loadingFallback: 'Loading...' }),
        },
      ),
    )
    const error = await renderVue(
      h(
        SDUIScreenProvider,
        {
          registry,
          actionRunner: new ActionRunner(),
          screenStore: createStaticScreenStore({
            status: 'error',
            route: { path: '/error' },
            error: new Error('No screen'),
          }),
        },
        {
          default: () =>
            h(SDUIScreenRenderer, {
              errorFallback: (state) => `Failed ${state.route.path}`,
            }),
        },
      ),
    )

    expect(loading).toContain('Loading...')
    expect(error).toContain('Failed /error')
  })

  it('passes screen route and data into action context', async () => {
    let buttonProps: Record<string, unknown> = {}
    const custom = vi.fn()
    const registry = createVueRegistry({
      Button: defineComponent({
        inheritAttrs: false,
        setup(_props, { attrs, slots }) {
          buttonProps = attrs
          return () => h('button', attrs, slots.default?.())
        },
      }),
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

    await renderVue(
      h(
        SDUIScreenProvider,
        {
          registry,
          actionRunner: new ActionRunner({ custom: { inspect: custom } }),
          screenStore: store,
        },
        {
          default: () => h(SDUIScreenRenderer),
        },
      ),
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

function renderVue(node: unknown): Promise<string> {
  return renderToString(
    createSSRApp({
      render: () => node,
    }),
  )
}

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
