import { ok } from '@/lib/http'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { data, error } = await supabaseAdmin.from('zones').select('*').order('code')
  if (error) throw error
  return ok(data)
}
