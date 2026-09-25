'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant
  label?: string
  children?: ReactNode
  testId: string
  block?: boolean
}

// Ported from ui.jsx's Button in the "SkyPermit design handoff" Claude
// Design project — className-based, styles live in skypermit.css.
export function Button({ variant = 'primary', label, children, testId, block = false, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`sp-btn sp-btn--${variant}${block ? ' sp-btn--block' : ''}`}
      data-testid={testId}
      {...rest}
    >
      {label ?? children}
    </button>
  )
}
