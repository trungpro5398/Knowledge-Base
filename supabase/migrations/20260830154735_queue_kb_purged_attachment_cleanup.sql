-- Keep Storage cleanup durable when a page subtree is permanently purged.
-- The API removes objects through the Storage API after the database
-- transaction commits, then acknowledges these rows. This avoids both
-- orphaned bytes and network calls while page locks are held.
CREATE TABLE IF NOT EXISTS tet_kb.pending_attachment_deletions (
  object_path text PRIMARY KEY,
  queued_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (length(object_path) BETWEEN 1 AND 1024)
);

CREATE INDEX IF NOT EXISTS idx_pending_attachment_deletions_queue
  ON tet_kb.pending_attachment_deletions (queued_at, object_path);

ALTER TABLE tet_kb.pending_attachment_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tet_kb.pending_attachment_deletions FROM anon, authenticated;

DROP POLICY IF EXISTS pending_attachment_deletions_no_direct_access
  ON tet_kb.pending_attachment_deletions;
CREATE POLICY pending_attachment_deletions_no_direct_access
  ON tet_kb.pending_attachment_deletions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION tet_kb.mutate_page_trash(
  p_action text,
  p_page_id uuid,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  target_space_id uuid;
  target_organization_id uuid;
  target_path tet_kb.ltree;
  target_status text;
  target_is_trashed boolean;
  actor_role text;
  affects_published boolean;
  affected_count integer := 0;
  queued_object_count integer := 0;
BEGIN
  IF p_action NOT IN ('trash', 'restore', 'purge') THEN
    RETURN jsonb_build_object('status', 'invalid_action', 'page', NULL);
  END IF;

  SELECT page.space_id
  INTO target_space_id
  FROM tet_kb.pages page
  WHERE page.id = p_page_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'page', NULL);
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('tet_kb:space:' || target_space_id::text, 0)
  );

  SELECT space.organization_id
  INTO target_organization_id
  FROM tet_kb.spaces space
  WHERE space.id = target_space_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'page', NULL);
  END IF;

  IF target_organization_id IS NOT NULL THEN
    PERFORM 1
    FROM tet_kb.organizations organization
    WHERE organization.id = target_organization_id
    FOR UPDATE;
  END IF;

  SELECT COALESCE(
    direct_membership.role,
    CASE
      WHEN organization_membership.role IN ('admin', 'owner') THEN 'admin'
      WHEN organization_membership.role = 'member' THEN 'viewer'
    END
  )
  INTO actor_role
  FROM tet_kb.spaces space
  LEFT JOIN tet_kb.memberships direct_membership
    ON direct_membership.space_id = space.id
   AND direct_membership.user_id = p_actor_user_id
  LEFT JOIN tet_kb.organization_memberships organization_membership
    ON organization_membership.organization_id = space.organization_id
   AND organization_membership.user_id = p_actor_user_id
  WHERE space.id = target_space_id;

  IF actor_role IS NULL THEN
    RETURN jsonb_build_object('status', 'not_member', 'page', NULL);
  END IF;
  IF actor_role NOT IN ('editor', 'admin') THEN
    RETURN jsonb_build_object('status', 'requires_editor', 'page', NULL);
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('tet_kb:page-tree:' || target_space_id::text, 0)
  );

  SELECT
    page.path,
    page.status,
    deleted.page_id IS NOT NULL
  INTO target_path, target_status, target_is_trashed
  FROM tet_kb.pages page
  LEFT JOIN tet_kb.trash deleted ON deleted.page_id = page.id
  WHERE page.id = p_page_id
    AND page.space_id = target_space_id
  FOR UPDATE OF page;

  IF NOT FOUND OR (p_action = 'trash' AND target_is_trashed) THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'page', NULL);
  END IF;

  IF p_action = 'purge' AND NOT target_is_trashed THEN
    RETURN jsonb_build_object('status', 'not_in_trash', 'page', NULL);
  END IF;

  PERFORM 1
  FROM tet_kb.pages page
  WHERE page.space_id = target_space_id
    AND page.path <@ target_path
  ORDER BY page.path::text, page.id
  FOR UPDATE;

  SELECT EXISTS (
    SELECT 1
    FROM tet_kb.pages page
    WHERE page.space_id = target_space_id
      AND page.path <@ target_path
      AND page.status = 'published'
      AND page.published_version_id IS NOT NULL
  )
  INTO affects_published;

  IF p_action = 'trash' THEN
    INSERT INTO tet_kb.trash (page_id, deleted_by)
    SELECT page.id, p_actor_user_id
    FROM tet_kb.pages page
    WHERE page.space_id = target_space_id
      AND page.path <@ target_path
    ON CONFLICT (page_id) DO UPDATE
    SET deleted_at = NOW(),
        deleted_by = EXCLUDED.deleted_by;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
  ELSIF p_action = 'restore' THEN
    DELETE FROM tet_kb.trash deleted
    USING tet_kb.pages page
    WHERE deleted.page_id = page.id
      AND page.space_id = target_space_id
      AND page.path <@ target_path;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
  ELSE
    -- Capture every known object path while the page metadata still exists.
    -- The Storage table branch also covers legacy objects whose attachment or
    -- pending-upload row is already missing.
    INSERT INTO tet_kb.pending_attachment_deletions (object_path)
    SELECT candidate.object_path
    FROM (
      SELECT attachment.file_path AS object_path
      FROM tet_kb.attachments attachment
      JOIN tet_kb.pages page ON page.id = attachment.page_id
      WHERE page.space_id = target_space_id
        AND page.path <@ target_path

      UNION

      SELECT pending.object_path
      FROM tet_kb.pending_attachment_uploads pending
      JOIN tet_kb.pages page ON page.id = pending.page_id
      WHERE page.space_id = target_space_id
        AND page.path <@ target_path

      UNION

      SELECT storage_object.name
      FROM storage.objects storage_object
      JOIN tet_kb.pages page
        ON page.id::text = split_part(storage_object.name, '/', 1)
      WHERE storage_object.bucket_id = 'attachments'
        AND page.space_id = target_space_id
        AND page.path <@ target_path
    ) candidate
    WHERE candidate.object_path <> ''
    ON CONFLICT (object_path) DO UPDATE
    SET queued_at = LEAST(
      tet_kb.pending_attachment_deletions.queued_at,
      EXCLUDED.queued_at
    );
    GET DIAGNOSTICS queued_object_count = ROW_COUNT;

    DELETE FROM tet_kb.pages page
    WHERE page.space_id = target_space_id
      AND page.path <@ target_path;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'page', jsonb_build_object(
      'space_id', target_space_id,
      'status', target_status,
      'path', target_path::text
    ),
    'affects_published', affects_published,
    'affected_count', affected_count,
    'queued_object_count', queued_object_count
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.mutate_page_trash(text, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.mutate_page_trash(text, uuid, uuid)
  TO service_role;
