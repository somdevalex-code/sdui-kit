import type {
  Component,
  ShallowRef,
  VNodeChild,
} from 'vue'
import type {
  ActionRunner,
  ComponentRegistry,
  RuntimeContext,
  SDUIAction,
  SDUINode,
  ScreenState,
  ScreenStoreAdapter,
} from '@sdui-kit/core'

export type VueSDUIComponent = Component | string

export interface VueSDUIContextValue {
  registry: ComponentRegistry<VueSDUIComponent>
  actionRunner: ActionRunner
  fallbackComponent?: VueSDUIComponent
}

export interface SDUIProviderProps extends VueSDUIContextValue {
  children?: VNodeChild
}

export type SDUIRendererNode =
  | SDUINode
  | SDUINode[]
  | string
  | number
  | boolean
  | null
  | undefined

export interface SDUIRendererProps {
  node: SDUIRendererNode
  context?: RuntimeContext
}

export interface SDUIInjectedProps {
  componentName: string
  sduiNode: SDUINode
  runAction: (action: SDUIAction, context?: RuntimeContext) => Promise<unknown>
  renderNode: (node: SDUIRendererNode) => VNodeChild
}

export interface SDUIScreenProviderProps extends VueSDUIContextValue {
  screenStore: ScreenStoreAdapter
  children?: VNodeChild
}

export type SDUIScreenStateRef = Readonly<ShallowRef<ScreenState>>

export type VueRenderableFallback =
  | VNodeChild
  | ((state: ScreenState) => VNodeChild)

export interface SDUIScreenRendererProps {
  context?: RuntimeContext
  loadingFallback?: VueRenderableFallback
  errorFallback?: VueRenderableFallback
  emptyFallback?: VueRenderableFallback
}
