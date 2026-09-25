-- Collapses operator identity onto a single column: operators.id now *is*
-- the Supabase Auth user id, replacing the separate user_id column added in
-- 0003_operator_auth.sql. Requested after 0003 landed, once user_id and id
-- were sitting side by side looking like duplicate identifiers.
--
-- The one operator row that predated auth (user_id is null — it was seeded
-- before login existed, never had a matching auth.users row) is removed
-- here, along with the pilot/aircraft/flight_request that referenced it.
-- That's sample data, not anything registered through the real login flow.
-- If real operators with user_id already set exist by the time this runs,
-- this migration does not handle them — it assumes none do (true as of
-- writing; verify before running against a project with real signups).

delete from flight_requests where operator_id in (select id from operators where user_id is null);
delete from operators where user_id is null;

alter table operators drop column user_id;

alter table operators
  alter column id drop default,
  add constraint operators_id_fkey foreign key (id) references auth.users(id) on delete cascade;
