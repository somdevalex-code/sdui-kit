import React, { useEffect } from 'react'
import {
  RuntimeContext,
  ScreenState,
  isRenderableScreenResponse,
} from '@sdui-kit/core'

import { SDUIRenderer } from './renderer.js'
import { useSDUIScreen, useSDUIScreenStore } from './screenContext.js'
import { SDUIScreenRendererProps } from './types.js'

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

  const renderableResponse =
    state.response && isRenderableScreenResponse(state.response)
      ? state.response
      : undefined

  if (
    (state.status === 'idle' || state.status === 'loading') &&
    !renderableResponse
  ) {
    return <>{renderFallback(loadingFallback, state)}</>
  }

  if (state.status === 'error' && !renderableResponse) {
    return <>{renderFallback(errorFallback, state) ?? null}</>
  }

  if (!renderableResponse) {
    return <>{renderFallback(emptyFallback, state)}</>
  }

  const renderContext: RuntimeContext = {
    ...context,
    route: state.route,
    screen: renderableResponse,
    data: renderableResponse.data,
    screenState: state,
  }

  return <SDUIRenderer node={renderableResponse.node} context={renderContext} />
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
