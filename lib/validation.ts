export type ValidationResult = { valid: true } | { valid: false; message: string }

export function ok(): ValidationResult {
  return { valid: true }
}

export function fail(message: string): ValidationResult {
  return { valid: false, message }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

export function isPlainDate(v: unknown): v is string {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false
  const d = new Date(v + 'T00:00:00Z')
  return !Number.isNaN(d.getTime())
}

export function isIsoDateTime(v: unknown): v is string {
  if (typeof v !== 'string') return false
  const d = new Date(v)
  return !Number.isNaN(d.getTime())
}

export function isPositiveInteger(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0
}

export function isOneOf<T extends string>(v: unknown, values: readonly T[]): v is T {
  return typeof v === 'string' && (values as readonly string[]).includes(v)
}
