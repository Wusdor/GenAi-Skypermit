-- Adds the missing plumbing for docs/04-frontend-spec.md's operator detail
-- view, which shows "rejection reason and rule reference when applicable."
-- rule_reference was already computed by the gate pipeline on every 422 but
-- never persisted — only failing_gate and rejection_reason were. This adds
-- it alongside those two, populated the same way, so a rejected request's
-- rule citation survives past the original submit response.
-- See docs/01-data-model.md, which has been updated to match.

alter table flight_requests add column rule_reference text;
