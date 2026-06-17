import {
  createRenderer,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  provide,
} from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ActionRunner, type ScreenStoreAdapter } from '@sdui-kit/core'

import {
  SDUIProvider,
  SDUIContextKey,
  SDUIRenderer,
  SDUIScreenContextKey,
  SDUIScreenProvider,
  SDUIScreenRenderer,
  createVueRegistry,
  useSDUIAction,
  useSDUIScreenStore,
} from '../src'

describe('@sdui-kit/vue', () => {
  it('subscribes on mount, loads idle screens, renders empty fallback, and unsubscribes', async () => {
    let state: ReturnType<ScreenStoreAdapter['getState']> = {
      status: 'idle',
      route: { path: '/idle' },
    }
    let listener: ((nextState: typeof state) => void) | undefined
    const unsubscribe = vi.fn()
    const store: ScreenStoreAdapter = {
      getState: () => state,
      subscribe: vi.fn((nextListener) => {
        listener = nextListener
        return unsubscribe
      }),
      load: vi.fn(async () => {
        state = {
          status: 'success',
          route: { path: '/idle' },
          response: {
            schemaVersion: '1.0',
            status: 'redirect',
            to: '/login',
          },
        }
        listener?.(state)
        return state
      }),
      refresh: vi.fn(),
      setRoute: vi.fn(),
    }
    const registry = createVueRegistry({})
    const actionRunner = new ActionRunner()
    const Harness = defineComponent({
      setup() {
        provide(SDUIScreenContextKey, store)
        provide(SDUIContextKey, { registry, actionRunner })

        return () =>
          h(SDUIScreenRenderer, {
            loadingFallback: 'Loading...',
            emptyFallback: 'Empty screen',
          })
      },
    })
    const { app, root } = mountVue(() => h(Harness))

    await Promise.resolve()
    await nextTick()

    expect(store.subscribe).toHaveBeenCalled()
    expect(store.load).toHaveBeenCalled()
    expect(hostText(root)).toContain('Empty screen')

    app.unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })

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

  it('renders SDUI nodes nested inside props, arrays, and plain objects', async () => {
    const registry = createVueRegistry({
      Text: defineComponent({
        setup(_props, { slots }) {
          return () => h('span', null, slots.default?.())
        },
      }),
      Panel: defineComponent({
        inheritAttrs: false,
        setup(_props, { attrs }) {
          return () =>
            h('section', null, [
              attrs.header,
              ...(attrs.items as unknown[]),
              (attrs.footer as { action?: unknown }).action,
              (attrs.footer as { label?: string }).label,
            ])
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
                componentName: 'Panel',
                props: {
                  header: {
                    componentName: 'Text',
                    props: { children: 'Header' },
                  },
                  items: [
                    {
                      componentName: 'Text',
                      props: { children: 'First' },
                    },
                    {
                      componentName: 'Text',
                      props: { children: 'Second' },
                    },
                  ],
                  footer: {
                    action: {
                      componentName: 'Text',
                      props: { children: 'Open' },
                    },
                    label: 'plain label',
                  },
                },
              },
            }),
        },
      ),
    )

    expect(html).toContain('Header')
    expect(html).toContain('First')
    expect(html).toContain('Second')
    expect(html).toContain('Open')
    expect(html).toContain('plain label')
  })

  it('renders nodes through the injected renderNode helper', async () => {
    const RuntimeWidget = defineComponent({
      inheritAttrs: false,
      setup(_props, { attrs }) {
        return () =>
          h('div', null, [
            (attrs.renderNode as (node: unknown) => unknown)({
              componentName: 'Text',
              props: { children: 'Rendered child' },
            }),
          ])
      },
    })
    const registry = createVueRegistry({
      RuntimeWidget: {
        component: RuntimeWidget,
        metadata: { injectRuntime: true },
      },
      Text: defineComponent({
        setup(_props, { slots }) {
          return () => h('span', null, slots.default?.())
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
              node: { componentName: 'RuntimeWidget' },
            }),
        },
      ),
    )

    expect(html).toContain('<span>Rendered child</span>')
  })

  it('renders registered string components', async () => {
    const registry = createVueRegistry({
      Button: 'button',
    })

    const html = await renderVue(
      h(
        SDUIProvider,
        { registry, actionRunner: new ActionRunner() },
        {
          default: () =>
            h(SDUIRenderer, {
              node: {
                componentName: 'Button',
                props: { children: 'Save' },
              },
            }),
        },
      ),
    )

    expect(html).toContain('<button>Save</button>')
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

  it('runs actions through useSDUIAction and errors outside the provider', async () => {
    let runAction!: ReturnType<typeof useSDUIAction>
    const inspect = vi.fn()
    const HookConsumer = defineComponent({
      setup() {
        runAction = useSDUIAction()
        return () => h('div', null, 'Ready')
      },
    })

    await renderVue(
      h(
        SDUIProvider,
        {
          registry: createVueRegistry({}),
          actionRunner: new ActionRunner({ custom: { inspect } }),
        },
        {
          default: () => h(HookConsumer),
        },
      ),
    )

    await runAction({ type: 'inspect' }, { data: { id: 1 } })

    expect(inspect).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'inspect' }),
      expect.objectContaining({ data: { id: 1 } }),
      expect.any(ActionRunner),
    )

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    try {
      await expect(renderVue(h(HookConsumer))).rejects.toThrow(
        'useSDUI must be used inside SDUIProvider',
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('errors when the screen store hook is used outside the screen provider', async () => {
    const HookConsumer = defineComponent({
      setup() {
        useSDUIScreenStore()
        return () => h('div', null, 'Ready')
      },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    try {
      await expect(renderVue(h(HookConsumer))).rejects.toThrow(
        'useSDUIScreenStore must be used inside SDUIScreenProvider',
      )
    } finally {
      warn.mockRestore()
    }
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

interface HostNode {
  type: string
  text?: string
  props?: Record<string, unknown>
  parent?: HostNode
  children: HostNode[]
}

function createTestRenderer() {
  return createRenderer<HostNode, HostNode>({
    patchProp(element, key, _previousValue, nextValue) {
      element.props = element.props ?? {}

      if (nextValue === undefined || nextValue === null) {
        delete element.props[key]
        return
      }

      element.props[key] = nextValue
    },
    insert(child, parent, anchor) {
      child.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1

      if (index >= 0) {
        parent.children.splice(index, 0, child)
        return
      }

      parent.children.push(child)
    },
    remove(child) {
      const parent = child.parent

      if (!parent) {
        return
      }

      const index = parent.children.indexOf(child)

      if (index >= 0) {
        parent.children.splice(index, 1)
      }
    },
    createElement(type) {
      return { type, children: [] }
    },
    createText(text) {
      return { type: '#text', text, children: [] }
    },
    createComment(text) {
      return { type: '#comment', text, children: [] }
    },
    setText(node, text) {
      node.text = text
    },
    setElementText(node, text) {
      node.text = text
      node.children = []
    },
    parentNode(node) {
      return node.parent ?? null
    },
    nextSibling(node) {
      const parent = node.parent

      if (!parent) {
        return null
      }

      const index = parent.children.indexOf(node)
      return parent.children[index + 1] ?? null
    },
  })
}

const testRenderer = createTestRenderer()

function mountVue(
  render: () => unknown,
): {
  app: ReturnType<typeof testRenderer.createApp>
  root: HostNode
} {
  const root: HostNode = { type: 'root', children: [] }
  const app = testRenderer.createApp({ render })

  app.mount(root)

  return { app, root }
}

function hostText(node: HostNode): string {
  return [node.text, ...node.children.map(hostText)]
    .filter((value): value is string => typeof value === 'string')
    .join('')
}
