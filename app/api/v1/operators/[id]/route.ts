import { getSessionOperator, hasReviewerHeader } from '@/lib/auth'
import { badRequest, forbidden, notFound, ok, unauthorized } from '@/lib/http'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isUuid } from '@/lib/validation'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return badRequest('id must be a valid UUID.')

  const isReviewer = hasReviewerHeader(request)
  const sessionOperator = isReviewer ? null : await getSessionOperator()
  if (!isReviewer && !sessionOperator) return unauthorized('Log in or provide X-Reviewer-Id.')
  if (!isReviewer && sessionOperator!.id !== id) {
    return forbidden('Operators may only view their own profile.')
  }

  const { data, error } = await supabaseAdmin.from('operators').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return notFound('Operator')

  return ok(data)
}
