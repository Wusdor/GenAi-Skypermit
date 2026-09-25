'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/client/api'
import type { OperatorRow } from '@/lib/types'

interface SessionContextValue {
  // undefined = session check not yet resolved, null = confirmed logged out
  operator: OperatorRow | null | undefined
  refresh: () => void
  setOperator: (operator: OperatorRow | null) => void
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<OperatorRow | null | undefined>(undefined)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.me().then((res) => {
      if (cancelled) return
      setOperator(res.ok ? res.data : null)
    })
    return () => {
      cancelled = true
    }
  }, [version])

  async function logout() {
    await api.logout()
    setOperator(null)
  }

  return (
    <SessionContext.Provider value={{ operator, refresh: () => setVersion((v) => v + 1), setOperator, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
