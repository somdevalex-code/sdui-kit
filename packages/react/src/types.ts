import React from 'react'
import {
  ActionRunner,
  ComponentRegistry,
  RuntimeContext,
  SDUIAction,
  SDUINode,
  ScreenState,
  ScreenStoreAdapter,
} from '@sdui-kit/core'

export type ReactSDUIComponent = React.ComponentType<any>

export interface ReactSDUIContextValue {
  registry: ComponentRegistry<ReactSDUIComponent>
  actionRunner: ActionRunner
  fallbackComponent?: ReactSDUIComponent
}

export interface SDUIProviderProps extends ReactSDUIContextValue {
  children: React.ReactNode
}

export interface SDUIRendererProps {
  node: SDUINode | SDUINode[] | string | number | boolean | null | undefined
  context?: RuntimeContext
}

export interface SDUIInjectedProps {
  sduiNode: SDUINode
  runAction: (action: SDUIAction, context?: RuntimeContext) => Promise<unknown>
  renderNode: (node: SDUIRendererProps['node']) => React.ReactNode
}

export interface SDUIScreenProviderProps extends ReactSDUIContextValue {
  screenStore: ScreenStoreAdapter
  children: React.ReactNode
}

export interface SDUIScreenRendererProps {
  context?: RuntimeContext
  loadingFallback?: React.ReactNode | ((state: ScreenState) => React.ReactNode)
  errorFallback?: React.ReactNode | ((state: ScreenState) => React.ReactNode)
  emptyFallback?: React.ReactNode | ((state: ScreenState) => React.ReactNode)
}
