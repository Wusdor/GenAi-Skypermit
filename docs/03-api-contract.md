# API Contract

Base path: `/api/v1`. JSON in, JSON out.

⚠️ **Authentication history:** this contract originally had "no
authentication anywhere, except reviewer endpoints" (a static `X-Reviewer-Id`
identity label, not real auth). That changed on explicit request — operators
now have real login/registration via Supabase Auth. See "Authentication &
authorisation" below. Reviewer identity is unchanged: still just the
`X-Reviewer-Id` header, not a login.

Implement these as Next.js route handlers under `app/api/v1/...`.

## Authentication & authorisation

Operators log in; reviewers still don't (unchanged — see above).

| # | Method | Path | Purpose |
|---|---|---|---|
| — | `POST` | `/operators` | Register: creates the Supabase Auth user *and* the Operator profile in one request, then signs the caller in (session cookie). Doubles as endpoint 1 below — "register" and "create an operator" are now the same action. |
| — | `POST` | `/auth/login` | Log in with email + password; sets the session cookie |
| — | `POST` | `/auth/logout` | Clear the session |
| — | `GET` | `/auth/me` | The logged-in operator's profile, or `401` |

These four aren't part of the original 16 (login/logout/me didn't exist
before; `/operators` is reused rather than duplicated). Added with explicit
sign-off, not guessed — see the note on scope below.

They're listed with `—` instead of a number **deliberately, not because
they were forgotten in a renumbering.** "The original 16" is a fixed,
named set (endpoints 1–16 below); auth endpoints were added after that set
was closed, so folding them into the same sequence (e.g. inserting them as
1–4 and bumping everything else) would make "endpoint 9" mean a different
thing depending on which version of this doc someone has open. If this
contract is ever regenerated, keep auth unnumbered for the same reason —
don't renumber 1–16 to make room.

**Enforcement — server-derived, not client-supplied.** Every operator-scoped
endpoint (pilots, aircraft, flight-requests create/list/submit/cancel/
validate) derives `operator_id` from the session; none of them accept it as
a request field or query param anymore, and none of them trust a client
claim about which operator is acting. A caller with no session gets `401`;
an authenticated operator reaching for another operator's resource gets
`403`. This was a deliberate scope decision alongside adding login itself —
login that didn't also change enforcement would be authentication theatre,
not authorisation.

**Reviewer-or-owner reads.** `GET` on a single pilot/aircraft/operator/
flight-request, and `POST .../validate`, accept *either* an owning
operator's session *or* any `X-Reviewer-Id` header — a reviewer needs to see
into any operator's data to do the job (docs/04-frontend-spec.md's "all
four gate results" on the queue detail view calls `validate`, and the
detail view needs the request itself). `GET /flight-requests` (list) is
forced to the session's operator_id when there's no reviewer header, and
unscoped (any operator, optional filters) when there is one — that's how
the reviewer queue keeps working across every operator.

**`authorisation_level` is no longer self-service.** Registration always
creates an operator at `L1` (least privilege); raising it is an out-of-band
admin action, not a registration-form field. See
`app/api/v1/operators/route.ts`.

## Registry

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | `POST` | `/operators` | Register an operator — see "Authentication & authorisation" above |
| 2 | `GET` | `/operators/{id}` | Retrieve an operator (self, or any reviewer) |
| 3 | `POST` | `/pilots` | Register a pilot under the logged-in operator |
| 4 | `GET` | `/pilots/{id}` | Retrieve a pilot, including derived currency status (owning operator, or any reviewer) |
| 5 | `POST` | `/aircraft` | Register an aircraft under the logged-in operator |
| 6 | `GET` | `/aircraft/{id}` | Retrieve an aircraft, including derived weight band (owning operator, or any reviewer) |

⚠️ **Extension beyond the original 16, added when building the frontend:**
`GET /pilots` and `GET /aircraft` list the logged-in operator's own
pilots/aircraft (each row includes the same derived field as the
single-entity `GET`). The original contract had no way to list either at
all, but `docs/04-frontend-spec.md` needs both a registry list and an
operator-scoped picker for each — the same shape `GET /zones` already
provides for the zone picker. Originally added as `?operator_id=` query
params before operator auth existed; now that scoping comes from the
session instead, so there's no query param at all. Added with explicit
sign-off rather than guessed. If this contract is regenerated from a source
document, fold these in rather than dropping them.

## Reference data

| # | Method | Path | Purpose |
|---|---|---|---|
| 7 | `GET` | `/zones` | List the zone catalogue |
| 8 | `GET` | `/zones/{code}` | Retrieve one zone |

Zones have no create/update endpoints in this API. They're managed as
reference data — see `supabase/seed.sql` and `supabase/SETUP.md`.

## Flight requests

| # | Method | Path | Purpose |
|---|---|---|---|
| 9 | `POST` | `/flight-requests` | Create a request in `DRAFT`, under the logged-in operator |
| 10 | `POST` | `/flight-requests/{id}/submit` | Run all four gates; move to `UNDER_REVIEW` or `REJECTED` (owning operator only) |
| 11 | `GET` | `/flight-requests/{id}` | Retrieve a request (owning operator, or any reviewer) |
| 12 | `GET` | `/flight-requests` | List, filtered by `state`, `zone_code`, date range — scoped to the logged-in operator; a reviewer instead gets every operator and may also filter by `operator_id` |
| 13 | `POST` | `/flight-requests/{id}/validate` | Dry-run all gates without changing state (owning operator, or any reviewer) |
| 14 | `POST` | `/flight-requests/{id}/cancel` | Cancel, subject to the deadline (owning operator only) |

**Endpoint 13 (`validate`) is important to get right.** It runs every gate
exactly as `submit` would, in the same order, and **never changes state**. It
exists so the frontend's "check before submitting" button can be cheap and
safe to call repeatedly, and so the reviewer detail view can show all four
gate results without side effects. Implement the gate pipeline as a single
shared function that both `submit` and `validate` call — don't duplicate the
gate logic between them.

## Reviewer — requires `X-Reviewer-Id`

| # | Method | Path | Purpose |
|---|---|---|---|
| 15 | `POST` | `/flight-requests/{id}/approve` | Approve a request under review |
| 16 | `POST` | `/flight-requests/{id}/reject` | Reject a request under review, with a required note |

Both endpoints write a `ReviewAction` row and move the request's state (see
`02-state-machine.md`). Return `400` if `X-Reviewer-Id` is missing.

## Error semantics

Six statuses carry meaning now (four originally, plus `401`/`403` added
alongside operator auth). The distinction that matters most: `409` means the
request cannot be attempted at all (wrong state, scheduling conflict); `422`
means it was attempted and a business rule refused it. `401` vs `403`: `401`
is "who are you" (no session, no reviewer header), `403` is "I know who you
are and it's not allowed" (wrong operator's resource, or the pre-existing
`SUSPENDED`-operator precondition — see docs/05-open-questions.md §1).

| Status | Meaning | Body |
|---|---|---|
| `400` | Malformed request body | validation detail |
| `401` | Not authenticated — no operator session and no `X-Reviewer-Id` | error detail |
| `403` | Authenticated, but not permitted for this resource | error detail |
| `404` | Entity not found | — |
| `409` | Invalid state transition, or a scheduling conflict between requests | conflict detail |
| `422` | Business rule violation, with the failing gate identified | structured, see below |

### The `422` body

Every `422` names the gate that failed and cites the rule that governed the
decision, so a rejection can be traced back to its source without reading the
implementation.

```json
{
  "failing_gate": "TIME_WINDOW",
  "rule_reference": "TSD-4 §3.2",
  "message": "Window falls within zone curfew"
}
```

| Field | Contract |
|---|---|
| `failing_gate` | One of `PILOT`, `AIRCRAFT`, `ZONE`, `TIME_WINDOW`. Gates evaluate in that order; the response names the **first** gate that failed. |
| `rule_reference` | Document + section responsible for the rule. Real values are in `docs/06-business-rules.md` §6 (as corrected by `docs/07-clarifications.md`) — use those verbatim, don't invent new ones. |
| `message` | Human-readable, specific to the failure. Written for an operator, not a developer. |

The `TSD-4 §3.2` example above is illustrative only (it's how the source
spec shows the shape) — it is not one of the real citations. Pull actual
values from `docs/06-business-rules.md` §6, e.g. `OH-1 §2.1` for a pilot
rating that doesn't cover the zone class, or `ZC-2026.1 §2` for an altitude
that exceeds the zone ceiling.

## Gate pipeline (shared by `submit` and `validate`)

Evaluate in this fixed order, stopping at the first failure:

1. `PILOT` gate
2. `AIRCRAFT` gate
3. `ZONE` gate
4. `TIME_WINDOW` gate

All four are fully specified in `docs/06-business-rules.md`, as corrected
by `docs/07-clarifications.md` — notably, the weight-band check belongs to
`AIRCRAFT`, not `ZONE`, despite the source document's literal wording (see
`CLAUDE.md`'s gate implementation status section for the full explanation).
`Operator.status = SUSPENDED` is a separate precondition on the write
endpoints themselves, not part of this pipeline — see
`docs/05-open-questions.md` §1 before implementing anything for it.
