-- SkyPermit — zone reference data
--
-- Source: docs/06-business-rules.md §4 (zone catalogue) and §1.4 (curfew
-- values, including the A-7 amendment narrowing KBP-CTR-3 and ODS-CTR-5).
-- Zones are read-only reference data maintained here directly, not through
-- the app's UI or API — there is intentionally no POST /zones endpoint.
--
-- Run this after supabase/migrations/0001_init.sql. See supabase/SETUP.md.

insert into zones (
  code, name, zone_class, ceiling_metres, permitted_bands,
  required_authorisation_level, curfew_start, curfew_end, active
) values
  ('KBP-CTR-3', 'Kyiv Boryspil Corridor 3', 'CONTROLLED', 120,
   array['C0', 'C1', 'C2'], 'L2', '23:00', '05:00', true),
  ('ODS-CTR-5', 'Odesa Corridor 5', 'CONTROLLED', 90,
   array['C0', 'C1', 'C2'], 'L2', '23:00', '05:00', true),
  ('LVV-RST-2', 'Lviv Restricted 2', 'RESTRICTED', 60,
   array['C0', 'C1'], 'L3', '22:00', '06:00', true),
  ('ZTM-RST-7', 'Zhytomyr Restricted 7', 'RESTRICTED', 45,
   array['C0'], 'L3', '22:00', '06:00', true),
  ('DNI-OPN-1', 'Dnipro Open 1', 'OPEN', 120,
   array['C0', 'C1', 'C2', 'C3'], 'L1', null, null, true),
  ('KHR-OPN-4', 'Kharkiv Open 4', 'OPEN', 120,
   array['C0', 'C1', 'C2', 'C3'], 'L1', null, null, true)
on conflict (code) do update set
  name = excluded.name,
  zone_class = excluded.zone_class,
  ceiling_metres = excluded.ceiling_metres,
  permitted_bands = excluded.permitted_bands,
  required_authorisation_level = excluded.required_authorisation_level,
  curfew_start = excluded.curfew_start,
  curfew_end = excluded.curfew_end,
  active = excluded.active;

-- KBP-CTR-3 and ODS-CTR-5 curfews come from amendment A-7, which narrows
-- ZC-2026.1's general 22:00–06:00 value to 23:00–05:00 for these two zones
-- specifically. If A-7 is ever superseded or these zones' curfews change,
-- update here and re-run — this file is the source of truth, not the
-- Table Editor. See docs/06-business-rules.md §1.4 for the full reasoning.
