// 24-30px, stroke 1.5, round caps, never filled — ported from ui.jsx in the
// "SkyPermit design handoff" Claude Design project.

interface IconProps {
  size?: number
  color?: string
}

const iconBase = {
  fill: 'none',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconCheck({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...iconBase}>
      <polyline points="4 13 9.5 18.5 20 6" />
    </svg>
  )
}

export function IconCross({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...iconBase}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export function IconWarning({ size = 26, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...iconBase}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <line x1="12" y1="16.8" x2="12" y2="16.9" />
    </svg>
  )
}

export function IconArrowRight({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...iconBase}>
      <line x1="4" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  )
}

export function IconChevronDown({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...iconBase}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
