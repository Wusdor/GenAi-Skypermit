import { notFound, ok } from '@/lib/http'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const { data, error } = await supabaseAdmin.from('zones').select('*').eq('code', code).maybeSingle()
  if (error) throw error
  if (!data) return notFound('Zone')

  return ok(data)
}
