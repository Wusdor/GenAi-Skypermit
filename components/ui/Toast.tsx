'use client'

import { useEffect } from 'react'
import { IconCheck, IconCross } from './icons'

// Success confirmation popup — same visual language as sp-card--emphasis
// (accent border + accent fill, no shadow/gradient per the design system's
// "3 colours, 2 families, no gradients/shadows/fills" rule). Floats above
// the page rather than blocking it, and auto-dismisses.
export function SuccessToast({
  message,
  onDismiss,
  testId = 'success-toast',
  duration = 4000,
}: {
  message: string
  onDismiss: () => void
  testId?: string
  duration?: number
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [onDismiss, duration])

  return (
    <div className="sp-toast" role="status" data-testid={testId}>
      <IconCheck size={18} color="var(--sp-accent)" />
      <span className="sp-toast__message">{message}</span>
      <button
        type="button"
        className="sp-toast__close"
        onClick={onDismiss}
        aria-label="Dismiss"
        data-testid={`${testId}-dismiss`}
      >
        <IconCross size={14} />
      </button>
    </div>
  )
}
