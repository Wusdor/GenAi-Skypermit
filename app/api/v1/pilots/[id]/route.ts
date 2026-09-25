import { getSessionOperator, hasReviewerHeader } from '@/lib/auth'
import { computePilotCurrencyStatus, pilotCurrencyExpiresOn } from '@/lib/derived'
import { badRequest, forbidden, notFound, ok, unauthorized } from '@/lib/http'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isUuid } from '@/lib/validation'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return badRequest('id must be a valid UUID.')

  const isReviewer = hasReviewerHeader(request)
  const sessionOperator = isReviewer ? null : await getSessionOperator()
  if (!isReviewer && !sessionOperator) return unauthorized('Log in or provide X-Reviewer-Id.')

  const { data, error } = await supabaseAdmin.from('pilots').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return notFound('Pilot')

  if (!isReviewer && data.operator_id !== sessionOperator!.id) {
    return forbidden('Operators may only view their own pilots.')
  }

  const now = new Date()
  return ok({
    ...data,
    currency_status: computePilotCurrencyStatus(data.certified_on, now),
    currency_expires_on: pilotCurrencyExpiresOn(data.certified_on).toISOString().slice(0, 10),
  })
}
