import React from 'react'
import { createRegistry, type ComponentRegistryInput } from '@sdui-kit/core'

import { ReactSDUIComponent } from './types.js'

export function createReactRegistry(
  entries?: ComponentRegistryInput<ReactSDUIComponent>,
) {
  return createRegistry<ReactSDUIComponent>(entries)
}

export const DefaultFallbackComponent: ReactSDUIComponent = ({
  componentName,
}) =>
  React.createElement(
    'div',
    { 'data-sdui-missing-component': '' },
    `Unknown SDUI component: ${String(componentName)}`,
  )
