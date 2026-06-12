import React, { createContext, useContext, useEffect, useState } from 'react'
import { ScreenState, ScreenStoreAdapter } from '@sdui-kit/core'

import { SDUIProvider } from './context'
import { SDUIScreenProviderProps } from './types'

const SDUIScreenContext = createContext<ScreenStoreAdapter | null>(null)

export function SDUIScreenProvider({
  children,
  registry,
  actionRunner,
  fallbackComponent,
  screenStore,
}: SDUIScreenProviderProps) {
  return (
    <SDUIScreenContext.Provider value={screenStore}>
      <SDUIProvider
        registry={registry}
        actionRunner={actionRunner}
        fallbackComponent={fallbackComponent}
      >
        {children}
      </SDUIProvider>
    </SDUIScreenContext.Provider>
  )
}

export function useSDUIScreenStore(): ScreenStoreAdapter {
  const store = useContext(SDUIScreenContext)

  if (!store) {
    throw new Error('useSDUIScreenStore must be used inside SDUIScreenProvider')
  }

  return store
}

export function useSDUIScreen(): ScreenState {
  const store = useSDUIScreenStore()
  const [state, setState] = useState(() => store.getState())

  useEffect(() => store.subscribe(setState), [store])

  return state
}
