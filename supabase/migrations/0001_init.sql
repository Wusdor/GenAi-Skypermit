-- SkyPermit — initial schema
-- Companion docs: docs/01-data-model.md, docs/05-business-rules-needed.md
-- Run via the Supabase CLI (recommended) or pasted into the SQL Editor —
-- see supabase/SETUP.md for both paths.

-- ─────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────
create type operator_authorisation_level as enum ('L1', 'L2', 'L3');
create type operator_status as enum ('ACTIVE', 'SUSPENDED');
create type pilot_rating as enum ('R_BASIC', 'R_ADVANCED', 'R_BVLOS');
create type pilot_status as enum ('ACTIVE', 'INACTIVE');
create type aircraft_status as enum ('ACTIVE', 'RETIRED');
create type zone_class as enum ('OPEN', 'CONTROLLED', 'RESTRICTED');
create type flight_request_state as enum (
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED',
  'REJECTED', 'CANCELLED', 'COMPLETED'
);
create type failing_gate as enum ('PILOT', 'AIRCRAFT', 'ZONE', 'TIME_WINDOW');
create type review_action_type as enum ('APPROVE', 'REJECT');

-- ─────────────────────────────────────────────────────────────
-- updated_at helper
-- ─────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Operators
-- ─────────────────────────────────────────────────────────────
create table operators (
  id                   uuid primary key default gen_random_uuid(),
  legal_name           text not null,
  national_id          text not null unique,
  email                text not null unique,
  phone                text,
  address_line         text,
  city                 text,
  postal_code          text,
  authorisation_level  operator_authorisation_level not null default 'L1',
  registered_on        date not null default current_date,
  status               operator_status not null default 'ACTIVE',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger trg_operators_updated_at
  before update on operators
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Pilots
-- Currency is derived from certified_on at READ time — see docs/01-data-model.md.
-- Do not add a "currency" column.
-- ─────────────────────────────────────────────────────────────
create table pilots (
  id             uuid primary key default gen_random_uuid(),
  operator_id    uuid not null references operators(id) on delete cascade,
  full_name      text not null,
  national_id    text not null unique,
  rating         pilot_rating not null,
  certified_on   date not null,
  status         pilot_status not null default 'ACTIVE',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_pilots_operator_id on pilots(operator_id);

create trigger trg_pilots_updated_at
  before update on pilots
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Aircraft
-- Weight band is derived from mtom_grams at READ time — see docs/01-data-model.md.
-- Do not add a "weight_band" column.
-- ─────────────────────────────────────────────────────────────
create table aircraft (
  id              uuid primary key default gen_random_uuid(),
  operator_id     uuid not null references operators(id) on delete cascade,
  manufacturer    text not null,
  model           text not null,
  serial_number   text not null unique,
  mtom_grams      integer not null check (mtom_grams > 0),
  registered_on   date not null default current_date,
  status          aircraft_status not null default 'ACTIVE',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_aircraft_operator_id on aircraft(operator_id);

create trigger trg_aircraft_updated_at
  before update on aircraft
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Zones — read-only reference data.
-- Not written by ordinary app flows. Populate via supabase/seed.sql once
-- the zone catalogue is defined (see docs/05-business-rules-needed.md).
-- permitted_bands taxonomy is pending the same source — text[] is a
-- reasonable starting shape, adjust if the real taxonomy needs more structure.
-- ─────────────────────────────────────────────────────────────
create table zones (
  code                           text primary key,
  name                           text not null,
  zone_class                     zone_class not null,
  ceiling_metres                 integer not null,
  permitted_bands                text[] not null default '{}',
  required_authorisation_level   operator_authorisation_level not null,
  curfew_start                   time,
  curfew_end                     time,
  active                         boolean not null default true
);

-- ─────────────────────────────────────────────────────────────
-- Flight requests — the system's centre of gravity
-- ─────────────────────────────────────────────────────────────
create table flight_requests (
  id                          uuid primary key default gen_random_uuid(),
  operator_id                 uuid not null references operators(id),
  pilot_id                    uuid not null references pilots(id),
  aircraft_id                 uuid not null references aircraft(id),
  zone_code                   text not null references zones(code),
  window_start                timestamptz not null,
  window_end                  timestamptz not null,
  requested_altitude_metres   integer not null check (requested_altitude_metres > 0),
  flight_purpose               text check (char_length(flight_purpose) <= 2000),
  state                       flight_request_state not null default 'DRAFT',
  rejection_reason            text,
  failing_gate                failing_gate,
  submitted_at                timestamptz,
  decided_at                  timestamptz,
  decided_by                  text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint window_valid check (window_end > window_start)
);

create index idx_flight_requests_state on flight_requests(state);
create index idx_flight_requests_operator on flight_requests(operator_id);
create index idx_flight_requests_zone_window
  on flight_requests(zone_code, window_start, window_end);
-- Overlap check reads only APPROVED + UNDER_REVIEW requests — see docs/02-state-machine.md
create index idx_flight_requests_aircraft_schedule
  on flight_requests(aircraft_id, state);

create trigger trg_flight_requests_updated_at
  before update on flight_requests
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Review actions — one row per reviewer decision
-- ─────────────────────────────────────────────────────────────
create table review_actions (
  id                  uuid primary key default gen_random_uuid(),
  flight_request_id   uuid not null references flight_requests(id) on delete cascade,
  reviewer_id         text not null,
  action              review_action_type not null,
  note                text,
  created_at          timestamptz not null default now()
);

create index idx_review_actions_request on review_actions(flight_request_id);

-- ─────────────────────────────────────────────────────────────
-- Audit log — append-only, every state transition
-- No update/delete path is exposed anywhere in the API or UI by design.
-- ─────────────────────────────────────────────────────────────
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  entity_type   text not null,
  entity_id     uuid not null,
  from_state    text,
  to_state      text not null,
  actor         text,
  created_at    timestamptz not null default now()
);

create index idx_audit_log_entity on audit_log(entity_type, entity_id);

-- Auto-log every flight_requests state change as a second line of defense
-- alongside the application layer.
create or replace function log_flight_request_transition()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE' and old.state is distinct from new.state) then
    insert into audit_log (entity_type, entity_id, from_state, to_state, actor)
    values ('FlightRequest', new.id, old.state::text, new.state::text,
            coalesce(new.decided_by, 'system'));
  elsif (tg_op = 'INSERT') then
    insert into audit_log (entity_type, entity_id, from_state, to_state, actor)
    values ('FlightRequest', new.id, null, new.state::text, 'system');
  end if;
  return new;
end;
$$;

create trigger trg_flight_requests_audit
  after insert or update on flight_requests
  for each row execute function log_flight_request_transition();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- RLS is enabled everywhere with NO permissive policies for anon/authenticated.
-- The app is expected to read/write exclusively through Next.js API routes
-- running server-side with the Supabase SERVICE ROLE key, which bypasses RLS.
-- Never expose the service role key to the browser.
-- If a client-side Supabase auth model is added later, write explicit
-- policies then — see supabase/SETUP.md for the decision this leaves open.
-- ─────────────────────────────────────────────────────────────
alter table operators        enable row level security;
alter table pilots           enable row level security;
alter table aircraft         enable row level security;
alter table zones            enable row level security;
alter table flight_requests  enable row level security;
alter table review_actions   enable row level security;
alter table audit_log        enable row level security;
