'use client'

import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'
import { SectionHeader } from '@/components/ui'

// swagger-ui-react touches `document` at import time, so it can't run
// during SSR — load it client-side only.
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

// Rendered at both /api-docs and /swagger — see those route files.
export function ApiDocs() {
  return (
    <section className="sp-section" data-testid="api-docs-page">
      <SectionHeader
        kicker="Reference"
        title="API reference"
        subhead="All 21 /api/v1 endpoints — request/response shapes, status codes, and the 422 gate-failure contract. Generated from public/openapi.yaml."
      />
      <div style={{ background: '#fff', borderRadius: 'var(--sp-radius)', overflow: 'hidden' }}>
        <SwaggerUI url="/openapi.yaml" />
      </div>
    </section>
  )
}
