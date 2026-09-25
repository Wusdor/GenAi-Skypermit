import { createSupabaseServerClient } from './supabase-server'
import { supabaseAdmin } from './supabase-admin'
import type { OperatorRow } from './types'

// Resolves the calling operator from the session cookie, if any. Used by
// every operator-scoped route handler instead of trusting a client-supplied
// operator_id (see docs/03-api-contract.md's "Authentication & authorisation"
// section for why). Only call this from Route Handlers / Server Actions —
// it may write refreshed session cookies, which Server Components can't do.
export async function getSessionOperator(): Promise<OperatorRow | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabaseAdmin.from('operators').select('*').eq('id', user.id).maybeSingle()
  if (error) throw error
  return data as OperatorRow | null
}

export function hasReviewerHeader(request: Request): boolean {
  return Boolean(request.headers.get('X-Reviewer-Id'))
}
