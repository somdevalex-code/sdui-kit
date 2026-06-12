import { RuntimeContext, SDUIAction } from '@sdui-kit/core'

import { useSDUI } from './context'

export function useSDUIAction() {
  const { actionRunner } = useSDUI()

  return (action: SDUIAction, context: RuntimeContext = {}) =>
    actionRunner.run(action, context)
}
