# UML Diagrams

Generated reference, derived from `01-data-model.md` and
`02-state-machine.md`. If those docs and the schema ever drift, treat them
as the source of truth and regenerate this file — don't hand-edit this one
out of sync with them.

Mermaid syntax — renders natively on GitHub, GitLab, and most markdown
viewers.

## Entity-Relationship Diagram

```mermaid
erDiagram
    OPERATOR ||--o{ PILOT : registers
    OPERATOR ||--o{ AIRCRAFT : registers
    OPERATOR ||--o{ FLIGHT_REQUEST : owns
    PILOT ||--o{ FLIGHT_REQUEST : flies
    AIRCRAFT ||--o{ FLIGHT_REQUEST : uses
    ZONE ||--o{ FLIGHT_REQUEST : "requested in"
    FLIGHT_REQUEST ||--o{ REVIEW_ACTION : "decided by"

    OPERATOR {
        uuid id PK "FK to auth.users(id)"
        string legal_name
        string national_id UK
        string email UK
        string phone
        string address_line
        string city
        string postal_code
        enum authorisation_level "L1, L2, L3"
        date registered_on
        enum status "ACTIVE, SUSPENDED"
    }

    PILOT {
        uuid id PK
        uuid operator_id FK
        string full_name
        string national_id UK
        enum rating "R_BASIC, R_ADVANCED, R_BVLOS"
        date certified_on "source of derived currency"
        enum status "ACTIVE, INACTIVE"
    }

    AIRCRAFT {
        uuid id PK
        uuid operator_id FK
        string manufacturer
        string model
        string serial_number UK
        int mtom_grams "source of derived weight band"
        date registered_on
        enum status "ACTIVE, RETIRED"
    }

    ZONE {
        string code PK
        string name
        enum zone_class "OPEN, CONTROLLED, RESTRICTED"
        int ceiling_metres
        string permitted_bands "C0-C3 taxonomy"
        enum required_authorisation_level "L1, L2, L3"
        time curfew_start
        time curfew_end
        boolean active
    }

    FLIGHT_REQUEST {
        uuid id PK
        uuid operator_id FK
        uuid pilot_id FK
        uuid aircraft_id FK
        string zone_code FK
        timestamptz window_start "UTC"
        timestamptz window_end "UTC, after window_start"
        int requested_altitude_metres
        string flight_purpose "max 2000 chars"
        enum state "see state diagram"
        string rejection_reason "set on rejection"
        enum failing_gate "PILOT, AIRCRAFT, ZONE, TIME_WINDOW"
        string rule_reference "set alongside failing_gate"
        timestamptz submitted_at
        timestamptz decided_at
        string decided_by "reviewer identity"
    }

    REVIEW_ACTION {
        uuid id PK
        uuid flight_request_id FK
        string reviewer_id "from X-Reviewer-Id header"
        enum action "APPROVE, REJECT"
        string note "required when action=REJECT"
        timestamptz created_at
    }

    AUDIT_LOG {
        uuid id PK
        string entity_type "e.g. FlightRequest"
        uuid entity_id
        string from_state "nullable, for creation events"
        string to_state
        string actor
        timestamptz created_at
    }
```

`AuditLog` has no FK drawn — it's a generic append-only log keyed by
`(entity_type, entity_id)` against any entity, not a typed relation. `Zone`
is read-only reference data, not written by ordinary product flows.

## Flight Request State Diagram

```mermaid
stateDiagram-v2
    [*] --> DRAFT : create

    DRAFT --> SUBMITTED : submit
    SUBMITTED --> UNDER_REVIEW : gates pass (automatic)
    SUBMITTED --> REJECTED : gates fail (automatic)

    UNDER_REVIEW --> APPROVED : approve (reviewer)
    UNDER_REVIEW --> REJECTED : reject (reviewer, note required)

    APPROVED --> COMPLETED : complete (maintenance endpoint only)

    DRAFT --> CANCELLED : cancel (operator)
    SUBMITTED --> CANCELLED : cancel (operator, narrow window)
    UNDER_REVIEW --> CANCELLED : cancel (operator)
    APPROVED --> CANCELLED : cancel (operator, up to 2h before window_start)

    REJECTED --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]

    note right of SUBMITTED
        Transient — never observed
        at rest. Gates run
        synchronously inside submit.
    end note

    note right of REJECTED
        Terminal. failing_gate +
        rejection_reason (+ rule_reference)
        populated on gate failure.
    end note
```

Any `(from, action)` pair not drawn above is illegal and the API returns
`409` — including transitions that look plausible, like re-submitting a
request already `UNDER_REVIEW`.

## Gate Pipeline (sequence, shared by `submit` and `validate`)

```mermaid
sequenceDiagram
    participant C as Caller (operator/reviewer)
    participant API as API route
    participant GP as Gate pipeline
    participant DB as Supabase

    C->>API: POST /flight-requests/{id}/submit (or /validate)
    API->>DB: load FlightRequest, Pilot, Aircraft, Zone
    API->>GP: run pipeline(request)

    GP->>GP: 1. PILOT gate
    alt PILOT fails
        GP-->>API: 422 {failing_gate: PILOT, rule_reference, message}
    else PILOT passes
        GP->>GP: 2. AIRCRAFT gate
        alt AIRCRAFT fails
            GP-->>API: 422 {failing_gate: AIRCRAFT, ...}
        else AIRCRAFT passes
            GP->>GP: 3. ZONE gate
            alt ZONE fails
                GP-->>API: 422 {failing_gate: ZONE, ...}
            else ZONE passes
                GP->>GP: 4. TIME_WINDOW gate
                alt TIME_WINDOW fails
                    GP-->>API: 422 {failing_gate: TIME_WINDOW, ...}
                else all gates pass
                    GP-->>API: pass
                end
            end
        end
    end

    alt submit endpoint
        API->>DB: write state (UNDER_REVIEW or REJECTED) + AuditLog
        API-->>C: 200/201 with new state
    else validate endpoint
        API-->>C: 200 with per-gate results (no state change)
    end
```
