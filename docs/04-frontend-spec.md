# Frontend Scope

Two roles. The active role is chosen from a switcher in the header. Styling
is intentionally minimal — this interface exists to be automated (hence the
`data-testid` contract below), not to be a polished consumer product. Don't
over-invest in visual design here.

⚠️ **This used to say "no login" for both roles — no longer true for
operators.** Operators now register and log in for real (Supabase Auth,
session cookie); see `docs/03-api-contract.md`'s "Authentication &
authorisation" section. The reviewer role is unchanged: still just an
`X-Reviewer-Id` header typed into the header UI, not a login. Where this
document still says "the current operator," that identity now comes from
the session, not from anything the operator types in each visit.

## Operator portal

Requires login. Manages its own pilots, aircraft and requests — "its own"
now enforced server-side via the session, not merely a UI convention.

- **Login** (`/login`) and **register** (`/register`) pages. Registration is
  a single combined form: auth credentials (email, password) plus the
  Operator profile fields (`legal_name`, `national_id`, etc.) in one submit,
  creating both together and logging the operator in immediately.
  `authorisation_level` is not a field on this form — registration always
  starts an operator at `L1`; raising it is an out-of-band admin action.
- Registry pages for pilots and aircraft, each with a create form
- Request creation form:
  - Zone picker fed from `GET /zones`
  - Pilot and aircraft pickers (scoped to the current operator)
  - Window start and end inputs
  - Altitude input
  - Free-text purpose field
- **"Check before submitting"** button — calls `POST /flight-requests/{id}/validate`
  and shows a per-gate pass/fail result **without changing state**
- "My requests" list, filterable by state
- Request detail view showing rejection reason and rule reference when
  applicable

## Reviewer queue

Works the shared queue of requests awaiting decision.

- Pending requests table (state = `UNDER_REVIEW`), sortable by submission time
- Request detail showing all four gate results
- Approve and reject actions; reject requires a note (map to the required
  `note` field on `POST /flight-requests/{id}/reject`)

## Two contracts to hold exactly

**Selector stability.** Every interactive element carries a `data-testid`.
These values are part of the interface contract, not incidental markup —
automated suites bind to them. Set a sensible, stable value the first time
(e.g. `data-testid="flight-request-submit-button"`) and don't rename it later
unless the underlying element genuinely changes into something else.

⚠️ One exception happened when operator auth landed: `operator-id-input`
(a free-text box for pasting an operator UUID, the only way to establish
"current operator" before login existed) was removed. It's not renamed —
the element it named no longer exists; a manually-typed ID has no place
once identity comes from a session. In its place: `operator-login-link`,
`operator-register-link` (shown when logged out), and
`operator-session-info` / `operator-logout-button` (shown when logged in).

**The form does not pre-filter.** Pilot, aircraft and zone pickers in the
request creation form are **not** filtered against the business rules — an
operator can select a combination that cannot possibly pass. Rules are
enforced only at `validate` and `submit`, never while the form is being
filled in. Don't add client-side eligibility filtering to the pickers, even
though it might seem like an obvious improvement — it isn't part of the
spec and would hide gate failures the operator needs to see.
