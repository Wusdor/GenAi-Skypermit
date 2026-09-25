import { getSessionOperator } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/http'

export async function GET() {
  const operator = await getSessionOperator()
  if (!operator) return unauthorized('Not logged in.')
  return ok(operator)
}
