'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useIdentity } from './identity'
import { useSession } from './session'

const OPERATOR_NAV = [
  { href: '/operator/pilots', label: 'Pilots', testid: 'operator-nav-pilots' },
  { href: '/operator/aircraft', label: 'Aircraft', testid: 'operator-nav-aircraft' },
  { href: '/operator/requests', label: 'My Requests', testid: 'operator-nav-requests' },
  { href: '/operator/requests/new', label: 'New Request', testid: 'operator-nav-new-request' },
]

const REVIEWER_NAV = [{ href: '/reviewer', label: 'Queue', testid: 'reviewer-nav-queue' }]

// Shell header — ported from AppShell.jsx in the "SkyPermit design handoff"
// Claude Design project, adapted to this repo's real routing/auth (role
// switch, section nav, and login state all came from separate places
// before; the design folds them into one header, so this does too) while
// keeping every existing data-testid unchanged.
export function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { reviewerId, setReviewerId } = useIdentity()
  const { operator, logout } = useSession()

  const inOperator = pathname.startsWith('/operator')
  const inReviewer = pathname.startsWith('/reviewer')

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <header className="sp-header sp-texture">
      <div className="sp-shell-inner sp-header-bar">
        <Link href="/" className="sp-wordmark" data-testid="home-link">
          Skypermit
        </Link>

        <div className="sp-roleswitch" role="group" aria-label="Portal">
          <Link
            href="/operator/pilots"
            className="sp-roleswitch__btn"
            aria-current={inOperator ? 'page' : undefined}
            data-testid="role-switcher-operator"
          >
            Operator
          </Link>
          <Link
            href="/reviewer"
            className="sp-roleswitch__btn"
            aria-current={inReviewer ? 'page' : undefined}
            data-testid="role-switcher-reviewer"
          >
            Reviewer
          </Link>
        </div>

        {!inReviewer && operator === undefined && <span className="sp-status-info">Checking session…</span>}

        {!inReviewer && operator === null && (
          <nav className="sp-nav" aria-label="Account">
            <Link href="/login" className="sp-nav__item" data-testid="operator-login-link">
              Log in
            </Link>
            <Link href="/register" className="sp-nav__item" data-testid="operator-register-link">
              Register
            </Link>
          </nav>
        )}

        {inOperator && operator && (
          <nav className="sp-nav" aria-label="Sections">
            {OPERATOR_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="sp-nav__item"
                aria-current={pathname === n.href ? 'page' : undefined}
                data-testid={n.testid}
              >
                {n.label}
              </Link>
            ))}
            <span className="sp-meta sp-nav__org" data-testid="operator-session-info">
              {operator.legal_name}
            </span>
            <button type="button" className="sp-btn sp-btn--quiet" onClick={handleLogout} data-testid="operator-logout-button">
              Log out
            </button>
          </nav>
        )}

        {inReviewer && (
          <nav className="sp-nav" aria-label="Sections">
            {REVIEWER_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="sp-nav__item"
                aria-current={pathname === n.href ? 'page' : undefined}
                data-testid={n.testid}
              >
                {n.label}
              </Link>
            ))}
            <label className="sp-meta sp-nav__org" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Reviewer ID
              <input
                data-testid="reviewer-id-input"
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value.trim())}
                placeholder="reviewer identity string"
                className="sp-field__control"
                style={{ width: '14rem', padding: '6px 10px', fontSize: '13px' }}
              />
            </label>
          </nav>
        )}
      </div>
    </header>
  )
}
