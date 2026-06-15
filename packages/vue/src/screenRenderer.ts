import {
  defineComponent,
  h,
  onMounted,
  type PropType,
  type VNodeChild,
} from 'vue'
import {
  type RuntimeContext,
  type ScreenState,
  isRenderableScreenResponse,
} from '@sdui-kit/core'

import { SDUIRenderer } from './renderer.js'
import { useSDUIScreen, useSDUIScreenStore } from './screenContext.js'
import type { VueRenderableFallback } from './types.js'

export const SDUIScreenRenderer = defineComponent({
  name: 'SDUIScreenRenderer',
  props: {
    context: {
      type: Object as PropType<RuntimeContext>,
      default: () => ({}),
    },
    loadingFallback: {
      type: null as unknown as PropType<VueRenderableFallback>,
      default: null,
    },
    errorFallback: {
      type: null as unknown as PropType<VueRenderableFallback>,
      default: undefined,
    },
    emptyFallback: {
      type: null as unknown as PropType<VueRenderableFallback>,
      default: null,
    },
  },
  setup(props) {
    const store = useSDUIScreenStore()
    const state = useSDUIScreen()

    onMounted(() => {
      if (state.value.status === 'idle') {
        void store.load()
      }
    })

    return () => {
      const currentState = state.value
      const renderableResponse =
        currentState.response && isRenderableScreenResponse(currentState.response)
          ? currentState.response
          : undefined

      if (
        (currentState.status === 'idle' || currentState.status === 'loading') &&
        !renderableResponse
      ) {
        return renderFallback(props.loadingFallback, currentState)
      }

      if (currentState.status === 'error' && !renderableResponse) {
        return renderFallback(props.errorFallback, currentState) ?? null
      }

      if (!renderableResponse) {
        return renderFallback(props.emptyFallback, currentState)
      }

      const renderContext: RuntimeContext = {
        ...props.context,
        route: currentState.route,
        screen: renderableResponse,
        data: renderableResponse.data,
        screenState: currentState,
      }

      return h(SDUIRenderer, {
        node: renderableResponse.node,
        context: renderContext,
      })
    }
  },
})

function renderFallback(
  fallback: VueRenderableFallback | undefined,
  state: ScreenState,
): VNodeChild {
  return typeof fallback === 'function' ? fallback(state) : fallback
}
