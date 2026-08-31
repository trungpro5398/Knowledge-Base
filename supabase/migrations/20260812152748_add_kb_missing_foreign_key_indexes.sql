-- PostgreSQL does not index referencing columns automatically. These indexes
-- keep user deletion, joins, and audit/history lookups from scanning growing
-- Knowledge Base tables.
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by
  ON tet_kb.attachments (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_comments_version_id
  ON tet_kb.comments (version_id)
  WHERE version_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_page_versions_created_by
  ON tet_kb.page_versions (created_by);

CREATE INDEX IF NOT EXISTS idx_pages_created_by
  ON tet_kb.pages (created_by);

CREATE INDEX IF NOT EXISTS idx_pages_updated_by
  ON tet_kb.pages (updated_by);

CREATE INDEX IF NOT EXISTS idx_trash_deleted_by
  ON tet_kb.trash (deleted_by);
