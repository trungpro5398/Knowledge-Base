-- Keyset pagination keeps large comment threads from requiring a growing
-- OFFSET scan or returning an unbounded response.
CREATE INDEX IF NOT EXISTS idx_comments_page_created_at_id
  ON tet_kb.comments (page_id, created_at, id);
