-- Every supported audit read is scoped by space_id and ordered or filtered by
-- created_at. The composite index covers both legacy single-column indexes.
DROP INDEX IF EXISTS tet_kb.idx_audit_events_space;
DROP INDEX IF EXISTS tet_kb.idx_audit_events_created;
