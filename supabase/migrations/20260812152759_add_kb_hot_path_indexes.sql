-- These are the two remaining high-cardinality lookups that were still using
-- broad scans as data grows: the audit timeline and public attachment proxy.
CREATE INDEX IF NOT EXISTS idx_audit_events_space_created_at
  ON tet_kb.audit_events (space_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attachments_file_path
  ON tet_kb.attachments (file_path);
