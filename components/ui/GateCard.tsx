import type { FailingGate } from '@/lib/types'
import { Kicker } from './primitives'
import { IconCheck, IconCross } from './icons'

// A gate fail may use the pink flag ONLY when it is the single urgent
// element on the rendered page. Pass urgent={false} when something else on
// the same page already claims it (see docs in each screen that uses this).
export function GateBadge({ pass, urgent = true, testId }: { pass: boolean; urgent?: boolean; testId?: string }) {
  const cls = pass ? 'sp-badge sp-badge--pass' : urgent ? 'sp-badge sp-badge--fail-urgent' : 'sp-badge sp-badge--fail'
  return (
    <span className={cls} data-testid={testId}>
      {pass ? <IconCheck size={16} /> : <IconCross size={16} />}
      {pass ? 'pass' : 'fail'}
    </span>
  )
}

export interface GateCardProps {
  gate: FailingGate
  pass: boolean
  urgent?: boolean
  detail?: string
  rule?: string
  testId?: string
}

// Ported from ui.jsx's GateCard in the "SkyPermit design handoff" Claude
// Design project.
export function GateCard({ gate, pass, urgent = true, detail, rule, testId }: GateCardProps) {
  return (
    <div className={`sp-card sp-gate${!pass && urgent ? ' sp-card--urgent' : ''}`} data-testid={testId}>
      <div className="sp-gate__head">
        <Kicker>{gate}</Kicker>
        <GateBadge pass={pass} urgent={urgent} testId={testId ? `${testId}-result` : undefined} />
      </div>
      {detail ? <p className="sp-body">{detail}</p> : null}
      {rule ? <span className="sp-gate__rule">{rule}</span> : null}
    </div>
  )
}
