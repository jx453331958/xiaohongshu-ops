'use client'

import { createContext, useContext } from 'react'
import type { AppConfig } from '@/lib/app-config'
import { defaultAppConfig } from '@/lib/app-config'

const AppConfigContext = createContext<AppConfig>(defaultAppConfig)

export function AppConfigProvider({
  config,
  children,
}: {
  config: AppConfig
  children: React.ReactNode
}) {
  return (
    <AppConfigContext.Provider value={config}>
      {children}
    </AppConfigContext.Provider>
  )
}

export function useAppConfig() {
  return useContext(AppConfigContext)
}
