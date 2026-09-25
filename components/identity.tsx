'use client'

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react'

const REVIEWER_ID_KEY = 'skypermit.reviewerId'
const IDENTITY_EVENT = 'skypermit-identity-change'

interface IdentityContextValue {
  reviewerId: string
  setReviewerId: (value: string) => void
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(IDENTITY_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(IDENTITY_EVENT, callback)
  }
}

function getServerSnapshot() {
  return ''
}

// The reviewer identity is a plain string label (X-Reviewer-Id), per
// CLAUDE.md: "not a real auth token" — deliberately unchanged by operator
// auth. Operators now log in for real; see components/session.tsx.
// useSyncExternalStore (rather than useEffect+setState) is what this repo's
// stricter React Compiler lint rules want for reading an external store:
// see react-hooks/set-state-in-effect.
function useLocalStorageValue(key: string): [string, (value: string) => void] {
  const getSnapshot = useCallback(() => window.localStorage.getItem(key) ?? '', [key])
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setValue = useCallback(
    (next: string) => {
      window.localStorage.setItem(key, next)
      window.dispatchEvent(new Event(IDENTITY_EVENT))
    },
    [key]
  )
  return [value, setValue]
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [reviewerId, setReviewerId] = useLocalStorageValue(REVIEWER_ID_KEY)

  return <IdentityContext.Provider value={{ reviewerId, setReviewerId }}>{children}</IdentityContext.Provider>
}

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error('useIdentity must be used within IdentityProvider')
  return ctx
}
