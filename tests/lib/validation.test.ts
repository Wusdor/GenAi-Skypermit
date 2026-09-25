import { describe, expect, it } from 'vitest'
import {
  isIsoDateTime,
  isNonEmptyString,
  isOneOf,
  isPlainDate,
  isPositiveInteger,
  isUuid,
} from '@/lib/validation'

describe('isNonEmptyString', () => {
  it('accepts a non-blank string', () => {
    expect(isNonEmptyString('hello')).toBe(true)
  })
  it('rejects an empty or whitespace-only string', () => {
    expect(isNonEmptyString('')).toBe(false)
    expect(isNonEmptyString('   ')).toBe(false)
  })
  it('rejects non-strings', () => {
    expect(isNonEmptyString(123)).toBe(false)
    expect(isNonEmptyString(null)).toBe(false)
    expect(isNonEmptyString(undefined)).toBe(false)
  })
})

describe('isUuid', () => {
  it('accepts a well-formed v4-shaped UUID', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
  })
  it('accepts uppercase hex', () => {
    expect(isUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true)
  })
  it('rejects a malformed string', () => {
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid('123e4567-e89b-12d3-a456')).toBe(false)
    expect(isUuid(123)).toBe(false)
  })
})

describe('isPlainDate', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(isPlainDate('2026-01-15')).toBe(true)
  })
  it('rejects a full timestamp', () => {
    expect(isPlainDate('2026-01-15T00:00:00Z')).toBe(false)
  })
  it('rejects a non-date string and non-strings', () => {
    expect(isPlainDate('not-a-date')).toBe(false)
    expect(isPlainDate(20260115)).toBe(false)
  })
})

describe('isIsoDateTime', () => {
  it('accepts a valid ISO timestamp', () => {
    expect(isIsoDateTime('2026-01-15T12:00:00.000Z')).toBe(true)
  })
  it('rejects an unparseable string', () => {
    expect(isIsoDateTime('not-a-timestamp')).toBe(false)
  })
  it('rejects non-strings', () => {
    expect(isIsoDateTime(Date.now())).toBe(false)
  })
})

describe('isPositiveInteger', () => {
  it('accepts positive integers', () => {
    expect(isPositiveInteger(1)).toBe(true)
    expect(isPositiveInteger(30000)).toBe(true)
  })
  it('rejects zero, negatives, floats, and non-numbers', () => {
    expect(isPositiveInteger(0)).toBe(false)
    expect(isPositiveInteger(-5)).toBe(false)
    expect(isPositiveInteger(1.5)).toBe(false)
    expect(isPositiveInteger('5')).toBe(false)
  })
})

describe('isOneOf', () => {
  const RATINGS = ['R_BASIC', 'R_ADVANCED', 'R_BVLOS'] as const
  it('accepts a member of the set', () => {
    expect(isOneOf('R_BASIC', RATINGS)).toBe(true)
  })
  it('rejects a value outside the set', () => {
    expect(isOneOf('R_NOPE', RATINGS)).toBe(false)
    expect(isOneOf(123, RATINGS)).toBe(false)
  })
})
