# Open Questions — Canonical Status

This is the single source of truth for "is this resolved yet." Don't
duplicate this table elsewhere — `docs/06-business-rules.md` §7 and
`docs/07-clarifications.md` both point here instead of restating it.
`docs/07-clarifications.md` is still the place to read *why* each resolved
item was resolved the way it was (the reasoning and provenance); this file
only tracks current status.

| # | Question | Status | Blocks gate implementation? |
|---|---|---|---|
| 1 | What fails the `AIRCRAFT` gate? | **Resolved** — the weight-band check. See `docs/06-business-rules.md` §1.2 and `docs/07-clarifications.md` item 1. | No |
| 2 | `Aircraft.status = RETIRED` / `Pilot.status = INACTIVE` — tied to a gate? | **Resolved: no.** Neither is tied to any gate by any source document. Leave both unwired. See `docs/07-clarifications.md` item 2. | No |
| 3 | Operator authorisation level → which gate, which citation? | **Resolved** — `ZONE`, citing `OH-1 §4`. See `docs/07-clarifications.md` item 4. | No |
| 4 | `Operator.status = SUSPENDED` — status code and response shape | **Open.** See §1 below. | No — it's a precondition on writes, not a gate |
| 5 | Zone `active` flag — citation | **Open (rule settled, citation not fully confirmed).** See §2 below. | No — implement the rule now |

Only rows 4 and 5 are still genuinely unresolved. Neither blocks implementing
the four gates.

## 1. `Operator.status = SUSPENDED` — status code and response shape undefined

Confirmed: this is a precondition on write operations (create, submit,
approve), not a gate outcome. It must **not** be represented as a `422`
with a `failing_gate` — none of the four gate values fits, and forcing it
into that shape would misrepresent it. What's still missing is the actual
status code and response body to return when a suspended operator's request
is blocked.

**Don't invent one to make it fit the existing `422` contract.** If this
needs to ship before an answer arrives, flag it back rather than guessing —
a `403` with an ad hoc body is a reasonable placeholder to propose, but
should be called out as a placeholder in code and in conversation with
whoever owns the API contract, not treated as settled.

## 2. Zone `active` — citation not fully confirmed

The rule itself is settled (an inactive zone fails any flight request
against it, under the `ZONE` gate), and it's about as certain as the
operator-authorisation-level rule was before that got confirmed (see row 3
above). But `ZC-2026.1 §4` as its specific citation hasn't been confirmed
with the same certainty. Safe to implement the check now; worth a one-line
confirmation on the citation before treating `rule_reference: "ZC-2026.1 §4"`
as fully authoritative in a `422` body.

## What this means for implementation

All four gates — `PILOT`, `AIRCRAFT`, `ZONE`, `TIME_WINDOW` — have defined
logic in `docs/06-business-rules.md` and can be fully implemented. Nothing
here blocks that work.
