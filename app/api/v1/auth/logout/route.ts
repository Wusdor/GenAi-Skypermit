import { ok } from '@/lib/http'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  return ok({ ok: true })
}
