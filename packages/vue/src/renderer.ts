import {
  Fragment,
  defineComponent,
  h,
  type PropType,
  type VNode,
  type VNodeArrayChildren,
  type VNodeChild,
} from 'vue'
import {
  type RuntimeContext,
  type SDUIAction,
  type SDUINode,
  isRecord,
  isSDUINode,
} from '@sdui-kit/core'

import { useSDUI } from './context.js'
import { DefaultFallbackComponent } from './registry.js'
import type { SDUIRendererNode, VueSDUIComponent } from './types.js'

type VueRawChildren = string | number | boolean | VNode | VNodeArrayChildren

export const SDUIRenderer = defineComponent({
  name: 'SDUIRenderer',
  props: {
    node: {
      type: null as unknown as PropType<SDUIRendererNode>,
      default: undefined,
    },
    context: {
      type: Object as PropType<RuntimeContext>,
      default: () => ({}),
    },
  },
  setup(props) {
    const sdui = useSDUI()

    const renderNode = (
      current: SDUIRendererNode,
      currentContext: RuntimeContext = props.context,
    ): VNodeChild => {
      if (current == null || typeof current === 'boolean') {
        return null
      }

      if (typeof current === 'string' || typeof current === 'number') {
        return current
      }

      if (Array.isArray(current)) {
        return current.map((child, index) =>
          h(
            Fragment,
            { key: isSDUINode(child) ? child.id ?? index : index },
            [renderNode(child, currentContext)],
          ),
        )
      }

      const registration = sdui.registry.get(current.componentName)
      const component =
        registration?.component ??
        sdui.fallbackComponent ??
        DefaultFallbackComponent
      const rawProps = current.props ?? {}
      const componentProps = renderProps(rawProps, renderNode, currentContext)
      const childrenInput = (rawProps.children ??
        current.children) as SDUIRendererNode
      const renderedChildren = renderNode(childrenInput, currentContext)
      const runAction = (
        action: SDUIAction,
        actionContext: RuntimeContext = {},
      ) =>
        sdui.actionRunner.run(action, {
          ...currentContext,
          ...actionContext,
          node: current,
        })

      if (rawProps.action && !componentProps.onClick) {
        componentProps.onClick = (event: unknown) =>
          runAction(rawProps.action as SDUIAction, { event })
      }

      if (!registration && componentProps.componentName === undefined) {
        componentProps.componentName = current.componentName
      }

      if (registration?.metadata?.injectRuntime === true) {
        componentProps.componentName = current.componentName
        componentProps.sduiNode = current
        componentProps.runAction = runAction
        componentProps.renderNode = (child: SDUIRendererNode) =>
          renderNode(child, currentContext)
      }

      return renderComponent(component, componentProps, renderedChildren)
    }

    return () => renderNode(props.node, props.context)
  },
})

function renderProps(
  props: Record<string, unknown>,
  renderNode: (
    node: SDUIRendererNode,
    context?: RuntimeContext,
  ) => VNodeChild,
  context: RuntimeContext,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props)
      .map(([key, value]) => {
        if (key === 'action' || key === 'children') {
          return [key, undefined]
        }

        return [key, renderPropValue(value, renderNode, context)]
      })
      .filter(([, value]) => value !== undefined),
  )
}

function renderPropValue(
  value: unknown,
  renderNode: (
    node: SDUIRendererNode,
    context?: RuntimeContext,
  ) => VNodeChild,
  context: RuntimeContext,
): unknown {
  if (isSDUINode(value)) {
    return renderNode(value, context)
  }

  if (Array.isArray(value)) {
    if (value.every(isSDUINode)) {
      return renderNode(value, context)
    }

    return value.map((item) => renderPropValue(item, renderNode, context))
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        renderPropValue(nested, renderNode, context),
      ]),
    )
  }

  return value
}

function renderComponent(
  component: VueSDUIComponent,
  props: Record<string, unknown>,
  children: VNodeChild,
): VNodeChild {
  if (typeof component === 'string') {
    return h(component, props, normalizeRawChildren(children))
  }

  const rawChildren = normalizeRawChildren(children)
  return rawChildren === undefined
    ? h(component, props)
    : h(component, props, { default: () => rawChildren })
}

function normalizeRawChildren(
  children: VNodeChild,
): VueRawChildren | undefined {
  if (children == null || typeof children === 'boolean') {
    return undefined
  }

  return children as VueRawChildren
}
