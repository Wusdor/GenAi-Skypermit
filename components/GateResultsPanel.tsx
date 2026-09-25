import type { GateResult } from '@/lib/client/api'
import { GateBadge, Kicker } from '@/components/ui'
import type { FailingGate } from '@/lib/types'

const GATE_ORDER: FailingGate[] = ['PILOT', 'AIRCRAFT', 'ZONE', 'TIME_WINDOW']

type RowStatus = 'PASS' | 'FAIL' | 'NOT_EVALUATED'

// The API pipeline stops at the first failing gate (docs/03-api-contract.md
// gate pipeline section) — it never reports every gate's outcome
// independently. Gates ordered before the failing one are inferred PASS;
// gates after it were never reached.
function rowStatus(gate: FailingGate, result: GateResult | null): RowStatus {
  if (result === null) return 'NOT_EVALUATED'
  if (result.ok) return 'PASS'
  const gateIndex = GATE_ORDER.indexOf(gate)
  const failIndex = GATE_ORDER.indexOf(result.failing_gate)
  if (gateIndex < failIndex) return 'PASS'
  if (gateIndex === failIndex) return 'FAIL'
  return 'NOT_EVALUATED'
}

// Reproduces GateCard's markup (components/ui/GateCard.tsx) inline rather
// than rendering it directly, because this panel needs a `data-gate-status`
// attribute on the same root element that already carries the row's
// data-testid — GateCard's own root would collide with that testid if
// wrapped in another element.
export function GateResultsPanel({ result }: { result: GateResult | null }) {
  return (
    <div data-testid="flight-request-validate-result" className="sp-grid sp-grid--cards">
      {result === null && <p className="sp-status-info">Not yet checked.</p>}
      {GATE_ORDER.map((gate) => {
        const status = rowStatus(gate, result)
        const testId = `flight-request-gate-result-${gate}`
        const pass = status === 'PASS'
        const urgentClass = status === 'FAIL' ? ' sp-card--urgent' : ''

        return (
          <div key={gate} className={`sp-card sp-gate${urgentClass}`} data-testid={testId} data-gate-status={status}>
            <div className="sp-gate__head">
              <Kicker>{gate}</Kicker>
              {status === 'NOT_EVALUATED' ? (
                <span className="sp-badge">not evaluated</span>
              ) : (
                <GateBadge pass={pass} urgent />
              )}
            </div>
            {status === 'FAIL' && !result!.ok && (
              <>
                <p className="sp-body">{result!.message}</p>
                <span className="sp-gate__rule">{result!.rule_reference}</span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
