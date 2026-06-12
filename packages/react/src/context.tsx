import React, { createContext, useContext } from 'react'

import { ReactSDUIContextValue, SDUIProviderProps } from './types'

const SDUIContext = createContext<ReactSDUIContextValue | null>(null)

export function SDUIProvider({
  children,
  registry,
  actionRunner,
  fallbackComponent,
}: SDUIProviderProps) {
  return (
    <SDUIContext.Provider
      value={{ registry, actionRunner, fallbackComponent }}
    >
      {children}
    </SDUIContext.Provider>
  )
}

export function useSDUI(): ReactSDUIContextValue {
  const context = useContext(SDUIContext)

  if (!context) {
    throw new Error('useSDUI must be used inside SDUIProvider')
  }

  return context
}
