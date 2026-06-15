import {
  defineComponent,
  inject,
  provide,
  type InjectionKey,
  type PropType,
  type VNodeChild,
} from 'vue'
import type { ActionRunner, ComponentRegistry } from '@sdui-kit/core'

import type { VueSDUIComponent, VueSDUIContextValue } from './types.js'

export const SDUIContextKey: InjectionKey<VueSDUIContextValue> =
  Symbol('SDUIContext')

export const SDUIProvider = defineComponent({
  name: 'SDUIProvider',
  props: {
    registry: {
      type: Object as PropType<ComponentRegistry<VueSDUIComponent>>,
      required: true,
    },
    actionRunner: {
      type: Object as PropType<ActionRunner>,
      required: true,
    },
    fallbackComponent: {
      type: [Object, Function, String] as PropType<VueSDUIComponent>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    provide(SDUIContextKey, {
      registry: props.registry,
      actionRunner: props.actionRunner,
      fallbackComponent: props.fallbackComponent,
    })

    return () => slots.default?.() as VNodeChild
  },
})

export function useSDUI(): VueSDUIContextValue {
  const context = inject(SDUIContextKey, null)

  if (!context) {
    throw new Error('useSDUI must be used inside SDUIProvider')
  }

  return context
}
