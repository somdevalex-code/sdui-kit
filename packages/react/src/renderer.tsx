import React, { Fragment, useCallback } from 'react'
import {
  RuntimeContext,
  SDUIAction,
  SDUINode,
  isRecord,
  isSDUINode,
} from '@sdui-kit/core'

import { useSDUI } from './context'
import { DefaultFallbackComponent } from './registry'
import { SDUIRendererProps } from './types'

export function SDUIRenderer({ node, context = {} }: SDUIRendererProps) {
  const sdui = useSDUI()

  const renderNode = useCallback(
    (
      current:
        | SDUINode
        | SDUINode[]
        | string
        | number
        | boolean
        | null
        | undefined,
      currentContext: RuntimeContext = context,
    ): React.ReactNode => {
      if (current == null || typeof current === 'boolean') {
        return null
      }

      if (typeof current === 'string' || typeof current === 'number') {
        return current
      }

      if (Array.isArray(current)) {
        return current.map((child, index) => (
          <Fragment key={child.id ?? index}>
            {renderNode(child, currentContext)}
          </Fragment>
        ))
      }

      const registration = sdui.registry.get(current.componentName)
      const Component =
        registration?.component ??
        sdui.fallbackComponent ??
        DefaultFallbackComponent
      const rawProps = current.props ?? {}
      const renderedProps = renderProps(rawProps, renderNode, currentContext)
      const childrenInput = (rawProps.children ??
        current.children) as SDUIRendererProps['node']
      const runAction = (action: SDUIAction, actionContext: RuntimeContext = {}) =>
        sdui.actionRunner.run(action, {
          ...currentContext,
          ...actionContext,
          node: current,
        })

      const componentProps: Record<string, unknown> = {
        ...renderedProps,
        children: renderNode(childrenInput, currentContext),
      }

      if (rawProps.action && !componentProps.onClick) {
        componentProps.onClick = (event: unknown) =>
          runAction(rawProps.action as SDUIAction, { event })
      }

      if (registration?.metadata?.injectRuntime === true) {
        componentProps.componentName = current.componentName
        componentProps.sduiNode = current
        componentProps.runAction = runAction
        componentProps.renderNode = (child: SDUIRendererProps['node']) =>
          renderNode(child, currentContext)
      }

      return <Component {...componentProps} />
    },
    [context, sdui],
  )

  return <>{renderNode(node, context)}</>
}

function renderProps(
  props: Record<string, unknown>,
  renderNode: (
    node: SDUIRendererProps['node'],
    context?: RuntimeContext,
  ) => React.ReactNode,
  context: RuntimeContext,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => {
      if (key === 'action') {
        return [key, undefined]
      }

      return [key, renderPropValue(value, renderNode, context)]
    }).filter(([, value]) => value !== undefined),
  )
}

function renderPropValue(
  value: unknown,
  renderNode: (
    node: SDUIRendererProps['node'],
    context?: RuntimeContext,
  ) => React.ReactNode,
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
