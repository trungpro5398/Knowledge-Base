-- Performance indexes for frequently accessed lists
CREATE INDEX IF NOT EXISTS idx_page_versions_page_created_at
  ON page_versions (page_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_page_created_at
  ON comments (page_id, created_at);
