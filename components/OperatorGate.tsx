'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { useSession } from './session'

// Every /operator page requires a logged-in operator now — this replaces
// the old free-text Operator ID header field. Redirects to /login when the
// session check resolves to "not logged in."
export function OperatorGate({ children }: { children: ReactNode }) {
  const { operator } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (operator === null) router.replace('/login')
  }, [operator, router])

  if (operator === undefined) return <p className="sp-status-info">Checking session…</p>
  if (operator === null) return null

  return <>{children}</>
}
