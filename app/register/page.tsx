'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSession } from '@/components/session'
import { Button, Card, Field, SectionHeader } from '@/components/ui'
import { apiErrorMessage, api } from '@/lib/client/api'

const emptyForm = {
  email: '',
  password: '',
  legal_name: '',
  national_id: '',
  phone: '',
  address_line: '',
  city: '',
  postal_code: '',
}

export default function RegisterPage() {
  const router = useRouter()
  const { setOperator } = useSession()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await api.register({
      email: form.email,
      password: form.password,
      legal_name: form.legal_name,
      national_id: form.national_id,
      phone: form.phone || undefined,
      address_line: form.address_line || undefined,
      city: form.city || undefined,
      postal_code: form.postal_code || undefined,
    })
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
      <SectionHeader kicker="Operator / Account" title="Register as an operator" />
      <Card variant="emphasis" style={{ maxWidth: 560 }}>
        <form data-testid="operator-register-form" onSubmit={handleSubmit} className="sp-stack">
          <Field
            label="Email"
            type="email"
            testId="operator-register-email-input"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Field
            label="Password"
            type="password"
            testId="operator-register-password-input"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            minLength={8}
            required
          />
          <Field
            label="Legal name"
            testId="operator-register-legal-name-input"
            value={form.legal_name}
            onChange={(e) => setForm((f) => ({ ...f, legal_name: e.target.value }))}
            required
          />
          <Field
            label="National ID"
            testId="operator-register-national-id-input"
            value={form.national_id}
            onChange={(e) => setForm((f) => ({ ...f, national_id: e.target.value }))}
            required
          />
          <Field
            label="Phone"
            testId="operator-register-phone-input"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Field
            label="Address"
            testId="operator-register-address-line-input"
            value={form.address_line}
            onChange={(e) => setForm((f) => ({ ...f, address_line: e.target.value }))}
          />
          <Field
            label="City"
            testId="operator-register-city-input"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
          <Field
            label="Postal code"
            testId="operator-register-postal-code-input"
            value={form.postal_code}
            onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
          />
          {error && (
            <p className="sp-status-error" data-testid="operator-register-error">
              {error}
            </p>
          )}
          <Button type="submit" testId="operator-register-submit-button" disabled={submitting}>
            {submitting ? 'Registering…' : 'Register'}
          </Button>
          <p className="sp-meta">
            Already registered?{' '}
            <Link href="/login" data-testid="operator-register-login-link">
              Log in
            </Link>
          </p>
        </form>
      </Card>
    </section>
  )
}
