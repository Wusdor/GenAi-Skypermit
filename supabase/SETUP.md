# Supabase Setup

## One-time project setup

1. Create a project at [supabase.com](https://supabase.com) if you haven't
   already.
2. From **Project Settings → API**, note down:
   - `Project URL` → becomes `NEXT_PUBLIC_SUPABASE_URL`
   - `publishable` key (Supabase's newer key naming; `anon` `public` on older
     projects) → becomes `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `secret` key (`service_role` on older projects) → becomes
     `SUPABASE_SECRET_KEY`
3. In your Next.js project, add these to `.env.local` (never commit this
   file — check it's in `.gitignore`):

   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   SUPABASE_SECRET_KEY=your-secret-key
   ```

   The secret key bypasses Row Level Security entirely. It must only ever be
   read in server-side code (API routes, server actions) — never in a client
   component, never in anything shipped to the browser. The publishable key
   is also used server-side now, but only for the cookie-bound auth client in
   `lib/supabase-server.ts` (identity operations — sign up/in/out — never
   table reads/writes); see the RLS section below.

## Applying the schema

**Option A — Supabase CLI (recommended once you're iterating on the schema):**

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

This applies every file under `supabase/migrations/` in order. The project
ref is the string in your project's dashboard URL
(`supabase.com/dashboard/project/<ref>`).

**Option B — SQL Editor (fastest for a one-off first run):**

1. Open your project's dashboard → **SQL Editor**.
2. Paste the full contents of `supabase/migrations/0001_init.sql`.
3. Run it.

Either way, run it once. It creates every table, enum, index, trigger and RLS
setting described in `docs/01-data-model.md`.

`0002_flight_request_rule_reference.sql` and `0003_operator_auth.sql` have
now been applied. `0004_operators_id_is_auth_user.sql` follows on from
`0003`: it drops the `operators.user_id` column `0003` added and repoints
`operators.id` itself to `auth.users(id)` instead (see
`docs/01-data-model.md`). It also deletes any pre-auth operator row (and
anything that referenced it) that has no matching auth user — confirm there
are no real operators with `user_id` already set before running it
against a project that has real signups.

## Seeding reference data (zones)

`zones` is reference data, not something the app writes to. `supabase/seed.sql`
already has the real catalogue (`docs/06-business-rules.md` §4); this section
is about running it, not sourcing it:

1. Fill in `supabase/seed.sql` with real rows.
2. Run it the same way you ran the migration — CLI (`npx supabase db push`
   picks up seed files differently depending on your CLI version, so pasting
   into the SQL Editor is the more predictable path for seed data) or SQL
   Editor.

To edit a zone later — a curfew change, a new zone opening — either update
`supabase/seed.sql` and re-run it (the upsert pattern in that file handles
this safely), or edit the row directly in the **Table Editor**. If you edit
directly in the dashboard, also update `supabase/seed.sql` afterward so the
file stays the source of truth and a fresh environment can be seeded
correctly.

## Making schema changes later

Don't hand-edit tables in the dashboard and call it done — that leaves your
`supabase/migrations/` folder out of sync with reality, which breaks anyone
setting up a fresh environment (including Claude Code, next time it needs to
reason about the schema).

Instead, for any schema change:

```bash
npx supabase migration new describe_the_change
```

This creates a new timestamped file under `supabase/migrations/`. Write the
`alter table ...` statements there, then:

```bash
npx supabase db push
```

Keep `docs/01-data-model.md` updated to match — that file and the schema
should never drift apart. If you ask Claude Code to make a schema change,
ask it to update both in the same task.

## Row Level Security — resolved

The initial migration enables RLS on every table but adds no permissive
policies for the `anon` or `authenticated` roles, and that's still true after
adding operator login (`0003_operator_auth.sql`). No new RLS policies were
added, and none are needed under the current architecture: the browser never
queries Supabase directly. Supabase Auth (via `@supabase/ssr`, cookie-backed)
is used *only* for identity — signing up, logging in, logging out, and
resolving "who is this session" — never for reading or writing app tables
from the client. Every actual data operation still goes through Next.js API
routes using the service role key, which bypasses RLS exactly as before.

This was a real decision, not an oversight: routing operator identity
through the same server-side path as everything else meant real login could
ship without opening a second, RLS-gated access path to the database. If a
future change lets the browser query Supabase directly (e.g. real-time
subscriptions), RLS policies become necessary at that point — they still
don't exist today.
