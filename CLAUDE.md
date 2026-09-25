# SkyPermit — Project Instructions for Claude Code

This file is the entry point. Read it first, then read the files under `docs/` in
order before writing any code.

## What this is

SkyPermit is a system for registering drone operators, pilots and aircraft, and
for requesting, reviewing and tracking authorisation to fly in specific airspace
zones. A flight request moves through a fixed state machine, gated by four
automated checks, then a human reviewer approves or rejects it.

**Stack:** Next.js 16 (App Router, TypeScript), React 19, Supabase (Postgres,
RLS), Tailwind v4, Vitest. This is the actual stack in this repo — check
`package.json` before assuming otherwise if it ever looks like it's drifted.

## Commands

```bash
npm run dev         # start the dev server (localhost:3000)
npm run build       # production build — run before considering frontend work done
npm run lint        # eslint
npm test            # vitest run — full suite, single pass
npm run test:watch  # vitest, watch mode
```

There is no typecheck script; `npm run build` is what surfaces TypeScript
errors. Run `npm run lint` and `npm test` before calling any backend or gate
change done — see `tests/` (`tests/business-rules/`, `tests/lib/`,
`tests/routes/`) for existing coverage patterns to follow, especially
`tests/lib/gates/` for gate logic and `tests/fixtures.ts` for shared fixtures.

## Environment / local setup

Needs a `.env.local` (not committed) with `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` — see
`supabase/SETUP.md` for where these come from and how to apply the schema.
The secret key bypasses RLS and must never be used outside server-side code
(API routes) — never in a client component.

## Read in this order

1. `docs/01-data-model.md` — the seven entities, their fields, enums, and what's
   derived vs. stored
2. `docs/02-state-machine.md` — the seven states a flight request can occupy and
   the legal transitions between them
3. `docs/03-api-contract.md` — the original 16 endpoints plus the auth
   endpoints and two list endpoints added later with explicit sign-off (see
   that doc's "Authentication history" note and "Extension beyond the
   original 16" note — don't drop these if the contract is ever
   regenerated), status codes, and the `422` error body contract
4. `docs/04-frontend-spec.md` — the two portals, their pages, and the
   `data-testid` contract
5. `docs/06-business-rules.md` — the actual gate logic, thresholds, and zone
   catalogue. Read this before writing any gate function.
6. `docs/05-open-questions.md` — the canonical status of every open/resolved
   question (two items are still genuinely unresolved; the rest were
   resolved and are tracked here as the single source of truth for current
   status). Neither open item blocks gate implementation, but read this
   before touching operator `SUSPENDED` handling or citing the zone-active
   rule_reference.
7. `docs/07-clarifications.md` — the reasoning and provenance behind each
   resolution in `05` (why the rules owner decided it that way), plus the
   one confirmed correction to `06` itself. Read `05` first for *what's*
   currently true; come here for *why*. This file isn't updated again if a
   status in `05` later changes, so don't treat its wording as live status.

## Gate implementation status

All four gates are now fully specified in `docs/06-business-rules.md` (as
corrected by `docs/07-clarifications.md`) and should be implemented for
real, with real `rule_reference` values:

- **`PILOT`** — rating-vs-zone-class, and 18-month currency from
  `certified_on` checked against `window_start`. §1.1, §2.
- **`AIRCRAFT`** — the aircraft's derived weight band must be one of the
  zone's `permitted_bands`. §1.2. ⚠️ This rule is cited from `ZC-2026.1 §2`,
  whose literal text says it "fails the zone gate" — that wording is a
  confirmed corpus error (`docs/07-clarifications.md` item 1). Implement it
  in `lib/gates/aircraft-gate.ts`, not `lib/gates/zone-gate.ts`, and don't
  let the source document's literal wording override the confirmed
  assignment.
- **`ZONE`** — altitude vs. ceiling, operator authorisation level (now
  confirmed, `OH-1 §4`), and zone active flag (rule confirmed, citation not
  yet fully confirmed — see `docs/05-open-questions.md` §2). §1.3, §4 (zone
  catalogue — also drives `supabase/seed.sql`).
- **`TIME_WINDOW`** — lead time, advance-booking limit, duration bounds,
  curfew (including the `A-7` override for `KBP-CTR-3` / `ODS-CTR-5`), and
  the aircraft-schedule overlap check. §1.4.

Wire all four into the shared gate pipeline used by both `submit` and
`validate`, evaluating in order (`PILOT → AIRCRAFT → ZONE → TIME_WINDOW`)
and stopping at the first failure, per `docs/03-api-contract.md`.

**Not part of the gate pipeline:** `Operator.status = SUSPENDED` is a
precondition on write operations (create/submit/approve), not a gate — see
`docs/05-open-questions.md` §1 before implementing anything for it. Its
status code and response shape are still undefined; don't force it into the
`422`/`failing_gate` contract to make it fit. `Aircraft.status = RETIRED`
and `Pilot.status = INACTIVE` are confirmed unwired — no source document
ties either to a gate outcome, so leave them out of the gate logic
entirely.

## Implementation priorities

1. **Database** — apply every file under `supabase/migrations/` in order
   (currently `0001_init.sql` through `0004_operators_id_is_auth_user.sql`),
   then `supabase/seed.sql` for the real zone catalogue. See
   `supabase/SETUP.md`. Any new schema change gets its own migration file via
   `npx supabase migration new <name>` — never a hand-edit in the dashboard —
   and `docs/01-data-model.md` gets updated in the same task so the doc and
   the schema never drift apart.
2. **Data layer / API routes** — match `docs/03-api-contract.md` exactly:
   paths, methods, status codes.
3. **State machine enforcement** — any transition not shown in
   `docs/02-state-machine.md` returns `409`, including re-triggering a
   transition from a state that looks similar (e.g. re-submitting something
   already `UNDER_REVIEW`).
4. **Gate pipeline** — all four gates (`PILOT`, `AIRCRAFT`, `ZONE`,
   `TIME_WINDOW`) implemented for real per `docs/06-business-rules.md` and
   `docs/07-clarifications.md`.
5. **Frontend** — per `docs/04-frontend-spec.md`, with `data-testid` on every
   interactive element, set correctly the first time.

## Conventions

- Base API path: `/api/v1`. JSON in, JSON out.
- Operators authenticate for real via Supabase Auth (`@supabase/ssr`,
  cookie-backed — see `lib/supabase-server.ts` and
  `supabase/migrations/0003_operator_auth.sql` /
  `0004_operators_id_is_auth_user.sql`). `operators.id` **is**
  `auth.users(id)` — there is no separate `user_id` column anymore. That
  auth client is used *only* for identity (sign up/in/out, "who is this
  session") — never for reading or writing app tables from the client. Every
  actual data operation still goes through Next.js API routes using the
  service-role key, which bypasses RLS. Reviewer endpoints are separately
  gated by an `X-Reviewer-Id` header (a static string identity, not a real
  auth token) — the two auth mechanisms don't overlap.
- RLS is enabled on every table but has no permissive policies — this is
  intentional, not unfinished, as long as the browser never queries Supabase
  directly (see `supabase/SETUP.md` § Row Level Security). Don't add RLS
  policies to "fix" this without checking that doc first.
- `window_start` / `window_end` are stored and compared in **UTC**. Any
  conversion to zone-local time happens at evaluation time, not at write time.
- `flight_purpose` is free text, capped at 2,000 characters — enforce this in
  both API validation and the DB constraint (already in the migration).
- Derived values — pilot currency and aircraft weight band — are **computed at
  read time** and returned by the relevant `GET` endpoints. They are never
  stored as columns. Do not add `currency` or `weight_band` columns.
- Every `422` response includes `failing_gate`, `rule_reference`, and
  `message`. See `docs/03-api-contract.md` for the exact shape and
  `docs/06-business-rules.md` §6 for the real `rule_reference` values to use.
- `COMPLETED` is set only by a dedicated maintenance-completion endpoint —
  never inferred from elapsed time.
- The aircraft schedule overlap check considers only `APPROVED` and
  `UNDER_REVIEW` requests. `DRAFT`, `REJECTED`, `CANCELLED`, `COMPLETED` are
  invisible to it.
- Selectors (`data-testid`) are part of the interface contract. Don't rename
  one after it's set unless the underlying element genuinely changes.

## What "done" looks like for a first pass

- All endpoints in `docs/03-api-contract.md` implemented — the original 16
  plus the sign-off'd auth and list extensions — returning correct status
  codes for valid, malformed, conflicting, and rule-failing input.
- All 7 states and their legal transitions enforced; illegal transitions
  return `409`.
- Operator portal and reviewer queue functioning per the frontend spec.
- `PILOT`, `AIRCRAFT`, `ZONE`, `TIME_WINDOW` gates all fully implemented with
  real `rule_reference` citations (zone-active citation flagged per
  `docs/05-open-questions.md` §2 if not yet confirmed).
- `Operator.status = SUSPENDED` handling flagged rather than silently
  built, per `docs/05-open-questions.md` §1.
- All `supabase/migrations/` files and `supabase/seed.sql` applied, and the
  app reading/writing against real zone data successfully.

If anything in these docs is ambiguous or looks contradictory, say so rather
than guessing — flag it back to the person instead of picking a silent default
for anything business-logic-shaped.
