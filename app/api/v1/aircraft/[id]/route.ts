import { getSessionOperator, hasReviewerHeader } from '@/lib/auth'
import { computeWeightBand } from '@/lib/derived'
import { badRequest, forbidden, notFound, ok, unauthorized } from '@/lib/http'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isUuid } from '@/lib/validation'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return badRequest('id must be a valid UUID.')

  const isReviewer = hasReviewerHeader(request)
  const sessionOperator = isReviewer ? null : await getSessionOperator()
  if (!isReviewer && !sessionOperator) return unauthorized('Log in or provide X-Reviewer-Id.')

  const { data, error } = await supabaseAdmin.from('aircraft').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return notFound('Aircraft')

  if (!isReviewer && data.operator_id !== sessionOperator!.id) {
    return forbidden('Operators may only view their own aircraft.')
  }

  return ok({ ...data, weight_band: computeWeightBand(data.mtom_grams) })
}
