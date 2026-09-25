# Clarifications — Answers From the Business Rules Owner

This addendum records answers received directly from whoever owns the
Business Rules source material, resolving most of the open questions raised
in the earlier version of `docs/05-open-questions.md`. Where a clarification
here conflicts with the literal wording of `docs/06-business-rules.md`,
**this addendum governs** — it's a correction, not a competing
interpretation. `docs/06-business-rules.md` has been updated to match; this
file exists so the reasoning and provenance aren't lost.

**For current status** (what's resolved vs. still open right now), see
`docs/05-open-questions.md` — that's the canonical, single-place status
table. This file only explains *why* each item was decided the way it was;
it isn't updated again if a status changes, so don't treat its wording as
the live answer.

## 1. What fails the `AIRCRAFT` gate? — Resolved

**The weight-band check**: the aircraft's derived weight band against the
zone's `permitted_bands`. This is a real gate check, not a stub.

This directly reassigns a rule that `docs/06-business-rules.md` §1.3
(sourced from `ZC-2026.1` §2) had previously placed under `ZONE`, on the
strength of that source text literally saying "fails the zone gate."

**That placement was a corpus error in `ZC-2026.1` §2, not a trap or a
second valid reading.** The rule itself — aircraft weight band vs. zone's
permitted bands — is unchanged and still cites `ZC-2026.1 §2`. What changed
is which of the four gates it belongs to. Implement it in
`lib/gates/aircraft-gate.ts`, not `lib/gates/zone-gate.ts`.

## 2. `Aircraft.status = RETIRED` / `Pilot.status = INACTIVE`

Confirmed resolved as "no": nothing ties either field to a gate outcome.
Leave both unwired — don't infer a check for either from the pattern of the
gates that are defined. (Current status: `docs/05-open-questions.md` row 2.)

## 3. `Operator.status = SUSPENDED` — reasoning behind why it stays open

Confirmed: this is a **precondition on the write operations themselves**
(create / submit / approve), not a gate outcome. Two concrete consequences:

- It must **not** be represented as a `422` with a `failing_gate` — none of
  the four values (`PILOT`, `AIRCRAFT`, `ZONE`, `TIME_WINDOW`) is a valid
  fit, and forcing it into that shape would misrepresent it as a gate
  failure it isn't.
- The actual status code and response body to use for a suspended
  operator's blocked request are **undefined**. This still needs an answer
  before `POST /flight-requests`, `.../submit`, or `.../approve` can handle
  a suspended operator correctly. Don't default to `422` to make it fit the
  existing shape — raise this rather than guessing.

(Current status: `docs/05-open-questions.md` §1 / row 4 — still open.)

## 4. The two inferred `ZONE` rows — Resolved, with one reassignment

- **Altitude vs. ceiling → `ZONE`.** Confirmed as originally documented.
- **Operator authorisation level → `ZONE`.** Confirmed, citing `OH-1 §4`.
  No longer "inferred" — treat this with the same confidence as the
  explicit rows.
- **Weight band → `AIRCRAFT`, not `ZONE`.** Moved, per item 1 above. This
  was the one item in this group that turned out to be misplaced rather
  than merely under-cited.
- **Zone `active` flag → still unattributed.** This one is unresolved. The
  rule itself (an inactive zone fails any flight request against it) is
  presumably still under `ZONE` by elimination, but the citation
  (`ZC-2026.1 §4` in the earlier draft) hasn't been confirmed the way the
  other two rows now have been. Treat it as before: implement the check,
  but don't treat the citation as fully confirmed yet. (Current status:
  `docs/05-open-questions.md` §2 / row 5 — still open.)

## Net effect on gate implementation

All four gates now have a defined check to implement — `AIRCRAFT` is no
longer a stub. Only the `zone active` citation and the `SUSPENDED` operator
handling remain open, and neither blocks writing the gate logic itself.
