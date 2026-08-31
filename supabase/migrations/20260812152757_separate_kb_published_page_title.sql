-- Keep a published page's title stable while editors prepare a replacement
-- draft. The editable title remains on pages.title and is promoted only by
-- the explicit publish flow.
ALTER TABLE tet_kb.pages
  ADD COLUMN IF NOT EXISTS published_title text,
  ADD COLUMN IF NOT EXISTS published_updated_at timestamptz;

UPDATE tet_kb.pages p
SET
  published_title = p.title,
  published_updated_at = p.updated_at
WHERE p.status = 'published'
  AND p.published_version_id IS NOT NULL
  AND (p.published_title IS NULL OR p.published_updated_at IS NULL);

-- The older public-search index was named for published titles but indexed
-- the editable title column. Preserve it for editor search under an accurate
-- name, then build the public-search index on the immutable published title.
DO $$
BEGIN
  IF to_regclass('tet_kb.idx_pages_published_title_trgm') IS NOT NULL
     AND to_regclass('tet_kb.idx_pages_current_title_trgm') IS NULL THEN
    ALTER INDEX tet_kb.idx_pages_published_title_trgm
      RENAME TO idx_pages_current_title_trgm;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_pages_published_title_trgm
  ON tet_kb.pages USING gin (published_title gin_trgm_ops)
  WHERE status = 'published' AND published_title IS NOT NULL;
