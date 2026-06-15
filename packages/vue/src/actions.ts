import type { RuntimeContext, SDUIAction } from '@sdui-kit/core'

import { useSDUI } from './context.js'

export function useSDUIAction() {
  const { actionRunner } = useSDUI()

  return (action: SDUIAction, context: RuntimeContext = {}) =>
    actionRunner.run(action, context)
}
