'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSession } from '@/components/session'
import { Button, Card, Field, SectionHeader } from '@/components/ui'
import { apiErrorMessage, api } from '@/lib/client/api'

export default function LoginPage() {
  const router = useRouter()
  const { setOperator } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await api.login(email, password)
    setSubmitting(false)
    if (res.ok) {
      setOperator(res.data)
      router.push('/operator/pilots')
    } else {
      setError(apiErrorMessage(res.error))
    }
  }

  return (
    <section className="sp-section">
      <SectionHeader kicker="Operator / Account" title="Log in" />
      <Card variant="emphasis" style={{ maxWidth: 480 }}>
        <form data-testid="operator-login-form" onSubmit={handleSubmit} className="sp-stack">
          <Field
            label="Email"
            type="email"
            testId="operator-login-email-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            label="Password"
            type="password"
            testId="operator-login-password-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p className="sp-status-error" data-testid="operator-login-error">
              {error}
            </p>
          )}
          <Button type="submit" testId="operator-login-submit-button" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>
          <p className="sp-meta">
            No account yet?{' '}
            <Link href="/register" data-testid="operator-login-register-link">
              Register as an operator
            </Link>
          </p>
        </form>
      </Card>
    </section>
  )
}
