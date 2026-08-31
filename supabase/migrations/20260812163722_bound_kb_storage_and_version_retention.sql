-- Count every outstanding direct-upload reservation at the bucket's maximum
-- object size. The client-declared size is verified during registration, but
-- it must not be trusted for aggregate quota enforcement before bytes arrive.
ALTER TABLE tet_kb.pending_attachment_uploads
  ADD COLUMN IF NOT EXISTS reserved_bytes integer NOT NULL DEFAULT 10485760
  CHECK (reserved_bytes = 10485760);

UPDATE tet_kb.pending_attachment_uploads
SET reserved_bytes = 10485760
WHERE reserved_bytes <> 10485760;

CREATE OR REPLACE FUNCTION tet_kb.reserve_attachment_upload(
  p_page_id uuid,
  p_user_id uuid,
  p_object_path text,
  p_mime_type text,
  p_size_bytes integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, pg_catalog
AS $$
DECLARE
  attached_bytes bigint;
  pending_bytes bigint;
  attached_count integer;
  pending_count integer;
BEGIN
  -- Supabase Storage objects must be removed through the Storage API. Only
  -- release an expired reservation when no object was uploaded (or when the
  -- object was already registered and the stale reservation is redundant).
  DELETE FROM tet_kb.pending_attachment_uploads AS pending
  WHERE pending.expires_at <= now()
    AND (
      EXISTS (
        SELECT 1 FROM tet_kb.attachments AS attachment
        WHERE attachment.file_path = pending.object_path
      )
      OR NOT EXISTS (
        SELECT 1 FROM storage.objects AS storage_object
        WHERE storage_object.bucket_id = 'attachments'
          AND storage_object.name = pending.object_path
      )
    );

  PERFORM 1 FROM tet_kb.pages WHERE id = p_page_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found';
  END IF;

  SELECT COALESCE(sum(size_bytes), 0), count(*)
    INTO attached_bytes, attached_count
  FROM tet_kb.attachments
  WHERE page_id = p_page_id;

  SELECT COALESCE(sum(reserved_bytes), 0), count(*)
    INTO pending_bytes, pending_count
  FROM tet_kb.pending_attachment_uploads
  WHERE page_id = p_page_id;

  IF attached_count + pending_count >= 100
     OR attached_bytes + pending_bytes + 10485760 > 104857600 THEN
    RAISE EXCEPTION 'Attachment quota exceeded for this page';
  END IF;

  INSERT INTO tet_kb.pending_attachment_uploads
    (object_path, page_id, user_id, mime_type, size_bytes, reserved_bytes, expires_at)
  VALUES
    (p_object_path, p_page_id, p_user_id, p_mime_type, p_size_bytes, 10485760, now() + interval '10 minutes');
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.reserve_attachment_upload(uuid, uuid, text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.reserve_attachment_upload(uuid, uuid, text, text, integer)
  TO service_role;

-- Version history is displayed with a 100-row cap. Retain that useful window
-- and bound database/back-up growth from repeated manual snapshots, while
-- never deleting either page pointer.
CREATE OR REPLACE FUNCTION tet_kb.prune_page_versions_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, pg_catalog
AS $$
BEGIN
  WITH ranked AS (
    SELECT
      version.id,
      row_number() OVER (
        ORDER BY version.created_at DESC, version.id DESC
      ) AS position
    FROM tet_kb.page_versions AS version
    WHERE version.page_id = NEW.page_id
  ), protected AS (
    SELECT page.current_version_id, page.published_version_id
    FROM tet_kb.pages AS page
    WHERE page.id = NEW.page_id
  )
  DELETE FROM tet_kb.page_versions AS version
  USING ranked, protected
  WHERE version.id = ranked.id
    AND ranked.position > 100
    AND version.id IS DISTINCT FROM protected.current_version_id
    AND version.id IS DISTINCT FROM protected.published_version_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.prune_page_versions_after_insert()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prune_page_versions_after_insert
  ON tet_kb.page_versions;
CREATE TRIGGER prune_page_versions_after_insert
  AFTER INSERT ON tet_kb.page_versions
  FOR EACH ROW
  EXECUTE FUNCTION tet_kb.prune_page_versions_after_insert();

-- The keyset index covers both earlier comment indexes' leftmost prefixes.
DROP INDEX IF EXISTS tet_kb.idx_comments_page_created_at;
DROP INDEX IF EXISTS tet_kb.idx_comments_page;
