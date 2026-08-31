-- Browser uploads go directly to Storage after receiving a short-lived
-- reservation. If a tab closes before registration, remove the expired
-- reservation's object during the next reservation instead of accumulating
-- unreachable bytes indefinitely.
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
  WITH expired AS (
    DELETE FROM tet_kb.pending_attachment_uploads
    WHERE expires_at <= now()
    RETURNING object_path
  )
  DELETE FROM storage.objects AS storage_object
  USING expired
  WHERE storage_object.bucket_id = 'attachments'
    AND storage_object.name = expired.object_path
    -- A registered attachment must never be removed if legacy data leaves a
    -- stale reservation row behind.
    AND NOT EXISTS (
      SELECT 1
      FROM tet_kb.attachments AS attachment
      WHERE attachment.file_path = storage_object.name
    );

  -- Serialize reservations per page so concurrent requests cannot bypass the
  -- aggregate count/byte limits.
  PERFORM 1 FROM tet_kb.pages WHERE id = p_page_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found';
  END IF;

  SELECT COALESCE(sum(size_bytes), 0), count(*)
    INTO attached_bytes, attached_count
  FROM tet_kb.attachments
  WHERE page_id = p_page_id;

  SELECT COALESCE(sum(size_bytes), 0), count(*)
    INTO pending_bytes, pending_count
  FROM tet_kb.pending_attachment_uploads
  WHERE page_id = p_page_id;

  IF attached_count + pending_count >= 100
     OR attached_bytes + pending_bytes + p_size_bytes > 104857600 THEN
    RAISE EXCEPTION 'Attachment quota exceeded for this page';
  END IF;

  INSERT INTO tet_kb.pending_attachment_uploads
    (object_path, page_id, user_id, mime_type, size_bytes, expires_at)
  VALUES
    (p_object_path, p_page_id, p_user_id, p_mime_type, p_size_bytes, now() + interval '10 minutes');
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.reserve_attachment_upload(uuid, uuid, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION tet_kb.reserve_attachment_upload(uuid, uuid, text, text, integer) TO service_role;
