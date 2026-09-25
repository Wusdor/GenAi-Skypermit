import { NextResponse } from 'next/server'
import type { GateFailure } from './gates/types'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(entity = 'Resource') {
  return NextResponse.json({ error: `${entity} not found` }, { status: 404 })
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 })
}

export function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}

// Not logged in (or credentials invalid). Distinct from forbidden(): 401 is
// "who are you", 403 is "I know who you are and it's not allowed."
export function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function gateFailure(failure: GateFailure) {
  return NextResponse.json(
    {
      failing_gate: failure.failing_gate,
      rule_reference: failure.rule_reference,
      message: failure.message,
    },
    { status: 422 }
  )
}

// Postgres raises 22P02 for a malformed UUID/enum literal reaching a query —
// translate that into a 400 rather than letting a 500 leak through.
export function isMalformedInputError(error: { code?: string } | null): boolean {
  return error?.code === '22P02'
}
