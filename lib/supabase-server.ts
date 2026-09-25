import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Request-scoped client for identity operations only (sign in/up/out,
// reading the current user) — backed by the publishable key and the
// request's cookies. All actual data reads/writes still go through
// supabaseAdmin (service role), which bypasses RLS as before; this client
// is never used to query tables directly. Create a fresh one per request —
// never share across requests (see @supabase/ssr's own guidance).
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options)
        }
      },
    },
  })
}
