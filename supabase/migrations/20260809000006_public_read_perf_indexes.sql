-- Keep public documentation reads fast as page/version history grows.
-- Partial indexes stay small because public routes only read published pages.
CREATE INDEX IF NOT EXISTS idx_pages_public_tree
  ON tet_kb.pages (space_id, parent_id, sort_order)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_pages_published_title_trgm
  ON tet_kb.pages USING GIN (title gin_trgm_ops)
  WHERE status = 'published';

-- PostgreSQL does not automatically index the referencing side of a FK.
CREATE INDEX IF NOT EXISTS idx_pages_current_version
  ON tet_kb.pages (current_version_id)
  WHERE current_version_id IS NOT NULL;
