# Data Model

Seven entities. `Zone` is read-only reference data (not written by ordinary
product flows). `AuditLog` is append-only.

The matching Supabase schema is in `supabase/migrations/0001_init.sql`, plus
additive migrations since (`0002_flight_request_rule_reference.sql`,
`0003_operator_auth.sql`, `0004_operators_id_is_auth_user.sql`) — this
document and those files must stay in sync. If you change one, change the
other.

## Entities

### Operator
The account under which everything else is registered. Operators log in
(Supabase Auth) — see `docs/03-api-contract.md`'s "Authentication &
authorisation" section.

| Field | Notes |
|---|---|
| `id` | UUID, primary key, FK → `auth.users(id)` on delete cascade. Set at registration to the Supabase Auth user's own id — the operator row *is* keyed by its auth identity, not a separately generated value. `0003_operator_auth.sql` originally added a second `user_id` column for this; `0004_operators_id_is_auth_user.sql` collapsed the two back into `id` alone. |
| `legal_name` | |
| `national_id` | unique |
| `email` | unique |
| `phone` | |
| `address_line` | |
| `city` | |
| `postal_code` | |
| `authorisation_level` | enum, see below |
| `registered_on` | date |
| `status` | enum, see below |

### Pilot
A certified person, registered under one operator.

| Field | Notes |
|---|---|
| `id` | UUID, primary key |
| `operator_id` | FK → Operator |
| `full_name` | |
| `national_id` | unique |
| `rating` | enum, see below |
| `certified_on` | date — source of the derived currency status |
| `status` | enum, see below |

### Aircraft
The drone itself.

| Field | Notes |
|---|---|
| `id` | UUID, primary key |
| `operator_id` | FK → Operator |
| `manufacturer` | |
| `model` | |
| `serial_number` | unique |
| `mtom_grams` | source of the derived weight band |
| `registered_on` | date |
| `status` | enum, see below |

### Zone — read-only reference data
Named airspace volume. Populated/edited outside ordinary app flows (see
`supabase/seed.sql`), not via a create-zone form.

| Field | Notes |
|---|---|
| `code` | text, primary key |
| `name` | |
| `zone_class` | enum, see below |
| `ceiling_metres` | |
| `permitted_bands` | which weight bands may fly here, from the fixed `C0`–`C3` taxonomy — see `docs/06-business-rules.md` §3 |
| `required_authorisation_level` | enum, same set as `Operator.authorisation_level` |
| `curfew_start` | time |
| `curfew_end` | time |
| `active` | boolean |

### FlightRequest — the system's centre of gravity
A single requested flight.

| Field | Notes |
|---|---|
| `id` | UUID, primary key |
| `operator_id` | FK → Operator |
| `pilot_id` | FK → Pilot |
| `aircraft_id` | FK → Aircraft |
| `zone_code` | FK → Zone |
| `window_start` | timestamptz, UTC |
| `window_end` | timestamptz, UTC, must be after `window_start` |
| `requested_altitude_metres` | |
| `flight_purpose` | free text, max 2,000 characters |
| `state` | enum, see `02-state-machine.md` |
| `rejection_reason` | populated only on rejection |
| `failing_gate` | populated only on gate-failure rejection |
| `rule_reference` | populated only on gate-failure rejection, alongside `failing_gate` — added in `0002_flight_request_rule_reference.sql` so a rejected request's rule citation survives past the original `422` response, per `docs/04-frontend-spec.md`'s detail view |
| `submitted_at` | |
| `decided_at` | |
| `decided_by` | reviewer identity string |

### ReviewAction
Audit record of one reviewer decision.

| Field | Notes |
|---|---|
| `id` | UUID, primary key |
| `flight_request_id` | FK → FlightRequest |
| `reviewer_id` | from `X-Reviewer-Id` header |
| `action` | enum, see below |
| `note` | required when `action` is `REJECT` |
| `created_at` | |

### AuditLog — append-only
Record of every state transition, on any entity.

| Field | Notes |
|---|---|
| `id` | UUID, primary key |
| `entity_type` | e.g. `"FlightRequest"` |
| `entity_id` | |
| `from_state` | nullable, for creation events |
| `to_state` | |
| `actor` | |
| `created_at` | |

Never expose an update or delete path for this table, in the API or the UI.

## Enumerations

| Field | Values |
|---|---|
| `Operator.authorisation_level` | `L1`, `L2`, `L3` — ascending privilege |
| `Operator.status` | `ACTIVE`, `SUSPENDED` |
| `Pilot.rating` | `R_BASIC`, `R_ADVANCED`, `R_BVLOS` |
| `Pilot.status` | `ACTIVE`, `INACTIVE` |
| `Aircraft.status` | `ACTIVE`, `RETIRED` |
| `Zone.zone_class` | `OPEN`, `CONTROLLED`, `RESTRICTED` |
| `FlightRequest.failing_gate` | `PILOT`, `AIRCRAFT`, `ZONE`, `TIME_WINDOW` |
| `ReviewAction.action` | `APPROVE`, `REJECT` |

## Derived, never stored

These two values must be computed at read time. Persisting either creates a
staleness bug the moment its input field is corrected.

| Value | Derived from | Behaviour |
|---|---|---|
| Pilot currency | `certified_on` | Computed at the moment it is checked; exposed as a derived field on the pilot `GET` endpoint |
| Aircraft weight band | `mtom_grams` | Computed at read time. Correcting a registered mass recalculates the band immediately; flight authorisations already issued are **not** revisited |

The actual thresholds for both are in `docs/06-business-rules.md` §2–§3
(pilot currency: 18 months, `OH-1` §2.3; weight bands: `OH-1` §3).

## Time handling

- `window_start` / `window_end` are stored and compared in **UTC**.
- Zone availability (curfew) is defined against local zone time. The
  conversion from UTC happens at evaluation time (inside the `TIME_WINDOW`
  gate), never at write time.
- `flight_purpose` is free text, capped at 2,000 characters. Enforce this in
  both the API layer and the DB (`char_length` check constraint).
