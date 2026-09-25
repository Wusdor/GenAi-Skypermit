-- Links operators to Supabase Auth users so operators can log in and
-- register, per explicit request — this reverses the "no auth" design
-- documented in docs/03-api-contract.md and docs/04-frontend-spec.md
-- (both updated to match). Reviewer auth (the X-Reviewer-Id header) is
-- unchanged and out of scope for this change.
--
-- auth.users is Supabase's built-in table — always present, not created
-- here. Registration (POST /operators, now extended) creates both the
-- auth.users row (via the Admin API) and this row in the same request.

alter table operators add column user_id uuid unique references auth.users(id) on delete cascade;

create index idx_operators_user_id on operators(user_id);
