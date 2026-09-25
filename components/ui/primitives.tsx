'use client'

import { Fragment, type HTMLAttributes, type ReactNode } from 'react'

// Ported from ui.jsx in the "SkyPermit design handoff" Claude Design
// project (https://claude.ai/design/p/002d2e0a-3378-400d-ae85-dd42f72aeece).

export function Kicker({ children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className="sp-kicker" {...rest}>
      {children}
    </span>
  )
}

export function SectionHeader({
  kicker,
  title,
  subhead,
  aside,
  children,
}: {
  kicker: ReactNode
  title: ReactNode
  subhead?: ReactNode
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="sp-section-head">
      <Kicker>{kicker}</Kicker>
      {aside ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, flexWrap: 'wrap' }}>
          <h1 className="sp-title">{title}</h1>
          {aside}
        </div>
      ) : (
        <h1 className="sp-title">{title}</h1>
      )}
      {subhead ? <p className="sp-subhead">{subhead}</p> : null}
      {children}
    </div>
  )
}

export type CardVariant = 'default' | 'emphasis' | 'urgent'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  testId?: string
}

export function Card({ variant = 'default', className = '', children, testId, ...rest }: CardProps) {
  const variantClass = variant === 'emphasis' ? ' sp-card--emphasis' : variant === 'urgent' ? ' sp-card--urgent' : ''
  return (
    <div className={`sp-card${variantClass} ${className}`.trim()} data-testid={testId} {...rest}>
      {children}
    </div>
  )
}

export function Divider({ tone = 'accent' }: { tone?: 'accent' | 'urgent' }) {
  return <hr className={tone === 'urgent' ? 'sp-divider sp-divider--urgent' : 'sp-divider'} />
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  idPrefix = 'filter',
}: {
  options: T[]
  value: T
  onChange: (value: T) => void
  idPrefix?: string
}) {
  return (
    <div className="sp-filters" role="group" aria-label="Filter by state">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="sp-filter"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          data-testid={`${idPrefix}-${o.toLowerCase()}`}
        >
          {o.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  )
}

export function KeyValueList({ items, columns = 1 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 }) {
  return (
    <dl className={columns === 2 ? 'sp-kv sp-kv--two' : 'sp-kv'}>
      {items.map((i) => (
        <div className="sp-kv__item" key={i.label}>
          <dt className="sp-meta">{i.label}</dt>
          <dd className="sp-kv__value" style={{ margin: 0 }}>
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function SortHeader({
  label,
  direction,
  onToggle,
  testId,
}: {
  label: string
  direction: 'asc' | 'desc'
  onToggle: () => void
  testId: string
}) {
  return (
    <th aria-sort={direction === 'asc' ? 'ascending' : 'descending'}>
      <button type="button" className="sp-sortbtn" onClick={onToggle} data-testid={testId}>
        {label}
        <span className="sp-sortbtn__glyph">{direction === 'asc' ? '↑' : '↓'}</span>
      </button>
    </th>
  )
}

export function FlowList({ steps }: { steps: string[] }) {
  return (
    <div className="sp-flow">
      {steps.map((s, i) => (
        <Fragment key={s}>
          <span>{s}</span>
          {i < steps.length - 1 ? <span className="sp-flow__connector">{'↓'}</span> : null}
        </Fragment>
      ))}
    </div>
  )
}
