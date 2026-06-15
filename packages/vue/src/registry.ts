import { defineComponent, h } from 'vue'
import { createRegistry, type ComponentRegistryInput } from '@sdui-kit/core'

import type { VueSDUIComponent } from './types'

export function createVueRegistry(
  entries?: ComponentRegistryInput<VueSDUIComponent>,
) {
  return createRegistry<VueSDUIComponent>(entries)
}

export const DefaultFallbackComponent = defineComponent({
  name: 'SDUIDefaultFallback',
  props: {
    componentName: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    return () =>
      h(
        'div',
        { 'data-sdui-missing-component': '' },
        `Unknown SDUI component: ${String(props.componentName)}`,
      )
  },
})
