'use client'

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { IconChevronDown } from './icons'

export function RequiredTag({ children = 'required' }: { children?: ReactNode }) {
  return <span className="sp-badge sp-badge--required">{children}</span>
}

interface FieldBaseProps {
  label: string
  required?: boolean
  hint?: string
  hintTone?: 'default' | 'accent'
  testId: string
  requiredLabel?: ReactNode
  id?: string
}

type FieldAsInput = FieldBaseProps & { as?: 'input' } & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>
type FieldAsSelect = FieldBaseProps & { as: 'select' } & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'>
type FieldAsTextarea = FieldBaseProps & { as: 'textarea' } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'>

export type FieldProps = FieldAsInput | FieldAsSelect | FieldAsTextarea

// Ported from ui.jsx's Field in the "SkyPermit design handoff" Claude
// Design project. Native input/select/textarea props pass straight through
// (value, onChange, placeholder, type, min, maxLength, rows, ...) so this
// drops into existing controlled-form call sites unchanged.
export function Field(props: FieldProps) {
  const { label, as = 'input', required = false, hint, hintTone = 'default', testId, requiredLabel = 'required', id, ...control } = props
  const controlId = id ?? testId
  const Control = as
  const isSelect = as === 'select'

  const controlEl = (
    <Control
      id={controlId}
      className="sp-field__control"
      data-testid={testId}
      aria-required={required || undefined}
      {...(control as Record<string, unknown>)}
    />
  )

  return (
    <div className={`sp-field${required ? ' sp-field--required' : ''}`}>
      <div className="sp-field__labelrow">
        <label className="sp-meta" htmlFor={controlId}>
          {label}
        </label>
        {required ? <RequiredTag>{requiredLabel}</RequiredTag> : null}
      </div>
      {isSelect ? (
        <div className="sp-select-wrap">
          {controlEl}
          <span className="sp-select-chevron" aria-hidden="true">
            <IconChevronDown size={18} />
          </span>
        </div>
      ) : (
        controlEl
      )}
      {hint ? <p className={`sp-field__hint${hintTone === 'accent' ? ' sp-field__hint--accent' : ''}`}>{hint}</p> : null}
    </div>
  )
}

export interface SelectFieldOption {
  value: string
  label: string
}

export function SelectField({
  options = [],
  ...rest
}: Omit<FieldAsSelect, 'as' | 'children'> & { options?: (string | SelectFieldOption)[] }) {
  // Pickers never pre-filter: every option is rendered, none disabled.
  return (
    <Field as="select" {...rest}>
      {options.map((o) => {
        const value = typeof o === 'string' ? o : o.value
        const text = typeof o === 'string' ? o : o.label
        return (
          <option key={value} value={value}>
            {text}
          </option>
        )
      })}
    </Field>
  )
}
