import {
  defineComponent,
  h,
  inject,
  onMounted,
  onUnmounted,
  provide,
  shallowRef,
  type InjectionKey,
  type PropType,
} from 'vue'
import type {
  ActionRunner,
  ComponentRegistry,
  ScreenStoreAdapter,
} from '@sdui-kit/core'

import { SDUIProvider } from './context'
import type {
  SDUIScreenStateRef,
  VueSDUIComponent,
} from './types'

export const SDUIScreenContextKey: InjectionKey<ScreenStoreAdapter> =
  Symbol('SDUIScreenContext')

export const SDUIScreenProvider = defineComponent({
  name: 'SDUIScreenProvider',
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
    screenStore: {
      type: Object as PropType<ScreenStoreAdapter>,
      required: true,
    },
  },
  setup(props, { slots }) {
    provide(SDUIScreenContextKey, props.screenStore)

    return () =>
      h(
        SDUIProvider,
        {
          registry: props.registry,
          actionRunner: props.actionRunner,
          fallbackComponent: props.fallbackComponent,
        },
        slots,
      )
  },
})

export function useSDUIScreenStore(): ScreenStoreAdapter {
  const store = inject(SDUIScreenContextKey, null)

  if (!store) {
    throw new Error('useSDUIScreenStore must be used inside SDUIScreenProvider')
  }

  return store
}

export function useSDUIScreen(): SDUIScreenStateRef {
  const store = useSDUIScreenStore()
  const state = shallowRef(store.getState())
  let unsubscribe: (() => void) | undefined

  onMounted(() => {
    unsubscribe = store.subscribe((nextState) => {
      state.value = nextState
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  return state
}
