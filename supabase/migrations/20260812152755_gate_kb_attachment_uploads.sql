-- Direct browser uploads remain fast, but must first have a short-lived,
-- one-use server reservation. This prevents arbitrary orphan objects and
-- applies a hard per-page storage budget before bytes reach Storage.
CREATE TABLE IF NOT EXISTS tet_kb.pending_attachment_uploads (
  object_path text PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES tet_kb.pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 10485760),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_attachment_uploads_page_expiry
  ON tet_kb.pending_attachment_uploads (page_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_attachment_uploads_expiry
  ON tet_kb.pending_attachment_uploads (expires_at);

ALTER TABLE tet_kb.pending_attachment_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tet_kb.pending_attachment_uploads FROM anon, authenticated;

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
  DELETE FROM tet_kb.pending_attachment_uploads WHERE expires_at <= now();

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

CREATE OR REPLACE FUNCTION tet_kb.can_upload_attachment_object(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog
AS $$
  SELECT tet_kb.can_access_attachment_object(p_object_name, true)
     AND EXISTS (
       SELECT 1
       FROM tet_kb.pending_attachment_uploads pending
       WHERE pending.object_path = p_object_name
         AND pending.user_id = auth.uid()
         AND pending.expires_at > now()
     );
$$;

REVOKE ALL ON FUNCTION tet_kb.reserve_attachment_upload(uuid, uuid, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION tet_kb.can_upload_attachment_object(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION tet_kb.reserve_attachment_upload(uuid, uuid, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION tet_kb.can_upload_attachment_object(text) TO authenticated, service_role;

DROP POLICY IF EXISTS attachments_storage_insert ON storage.objects;
CREATE POLICY attachments_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attachments'
    AND tet_kb.can_upload_attachment_object(name)
  );
