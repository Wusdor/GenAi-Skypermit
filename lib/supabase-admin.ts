import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

// Server-only client. Bypasses RLS via the secret key — never import this
// from a client component or anything shipped to the browser. All /api/v1
// routes talk to Supabase exclusively through this client, per
// supabase/SETUP.md's "no client-side auth model" decision.
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false },
})
