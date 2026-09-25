import type { ReactNode } from 'react'
import { OperatorGate } from '@/components/OperatorGate'

// Section nav (Pilots/Aircraft/My Requests/New Request) now lives in
// AppHeader — see components/AppHeader.tsx's OPERATOR_NAV — since the
// SkyPermit design puts role-scoped nav in the global header rather than
// per-section. Same data-testids, just relocated.
export default function OperatorLayout({ children }: { children: ReactNode }) {
  return <OperatorGate>{children}</OperatorGate>
}
