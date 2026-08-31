-- An editor's autosave is a draft. Public readers must only ever receive an
-- explicitly selected, rendered version.
ALTER TABLE tet_kb.pages
  ADD COLUMN IF NOT EXISTS published_version_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_pages_published_version'
      AND conrelid = 'tet_kb.pages'::regclass
  ) THEN
    ALTER TABLE tet_kb.pages
      ADD CONSTRAINT fk_pages_published_version
      FOREIGN KEY (published_version_id)
      REFERENCES tet_kb.page_versions(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

-- Preserve the currently served content for existing published pages. The
-- join prevents carrying forward a corrupt cross-page version reference.
UPDATE tet_kb.pages p
SET published_version_id = p.current_version_id
FROM tet_kb.page_versions pv
WHERE p.status = 'published'
  AND p.current_version_id = pv.id
  AND pv.page_id = p.id
  AND p.published_version_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_pages_published_version
  ON tet_kb.pages (published_version_id)
  WHERE published_version_id IS NOT NULL;
