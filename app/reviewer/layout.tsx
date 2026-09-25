import type { ReactNode } from 'react'

// Section nav (Queue) now lives in AppHeader — see
// components/AppHeader.tsx's REVIEWER_NAV. Same data-testid
// (reviewer-nav-queue), just relocated.
export default function ReviewerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
