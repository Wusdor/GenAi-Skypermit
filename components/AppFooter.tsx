'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Ported from AppShell.jsx's footer in the "SkyPermit design handoff"
// Claude Design project. Purely decorative — no interactive elements, so
// no data-testid contract to preserve here.
export function AppFooter() {
  const pathname = usePathname()
  const inReviewer = pathname.startsWith('/reviewer')

  return (
    <footer className="sp-footer sp-texture">
      <div className="sp-shell-inner sp-footer-bar">
        <span className="sp-meta">Skypermit / internal</span>
        <span className="sp-meta">Rules revision 2026.08</span>
        <Link href="/api-docs" className="sp-meta" data-testid="footer-api-docs-link">
          API reference
        </Link>
        <span className="sp-meta" style={{ marginLeft: 'auto' }}>
          {inReviewer ? 'Reviewer queue' : 'Operator portal'}
        </span>
      </div>
    </footer>
  )
}
