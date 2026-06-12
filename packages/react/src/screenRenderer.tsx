import React, { useEffect } from 'react'
import { RuntimeContext, ScreenState } from '@sdui-kit/core'

import { SDUIRenderer } from './renderer'
import { useSDUIScreen, useSDUIScreenStore } from './screenContext'
import { SDUIScreenRendererProps } from './types'

export function SDUIScreenRenderer({
  context = {},
  loadingFallback = null,
  errorFallback,
  emptyFallback = null,
}: SDUIScreenRendererProps) {
  const store = useSDUIScreenStore()
  const state = useSDUIScreen()

  useEffect(() => {
    if (state.status === 'idle') {
      void store.load()
    }
  }, [state.status, store])

  if ((state.status === 'idle' || state.status === 'loading') && !state.response) {
    return <>{renderFallback(loadingFallback, state)}</>
  }

  if (state.status === 'error' && !state.response) {
    return <>{renderFallback(errorFallback, state) ?? null}</>
  }

  if (!state.response) {
    return <>{renderFallback(emptyFallback, state)}</>
  }

  const renderContext: RuntimeContext = {
    ...context,
    route: state.route,
    screen: state.response,
    data: state.response.data,
    screenState: state,
  }

  return <SDUIRenderer node={state.response.node} context={renderContext} />
}

function renderFallback(
  fallback:
    | React.ReactNode
    | ((state: ScreenState) => React.ReactNode)
    | undefined,
  state: ScreenState,
): React.ReactNode {
  return typeof fallback === 'function' ? fallback(state) : fallback
}
