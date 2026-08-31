-- Authorize and mutate a complete page subtree in one short transaction.
-- Browser roles do not receive direct access to this helper.
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
BEGIN
  IF p_action NOT IN ('trash', 'restore', 'purge') THEN
    RETURN jsonb_build_object('status', 'invalid_action', 'page', NULL);
  END IF;

  -- Resolve the lock key first, then re-read the target under the locks below.
  SELECT page.space_id
  INTO target_space_id
  FROM tet_kb.pages page
  WHERE page.id = p_page_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'page', NULL);
  END IF;

  -- Coordinate with direct and inherited membership mutations.
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

  -- Serialize trash lifecycle changes in the same space and lock the target
  -- before deriving its subtree.
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

  -- Lock the existing subtree in deterministic order. This prevents an
  -- update from partially overlapping the set being mutated.
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
    -- Restore the full subtree so descendants cannot remain invisibly stuck
    -- in trash after their parent is restored.
    DELETE FROM tet_kb.trash deleted
    USING tet_kb.pages page
    WHERE deleted.page_id = page.id
      AND page.space_id = target_space_id
      AND page.path <@ target_path;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
  ELSE
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
    'affected_count', affected_count
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.mutate_page_trash(text, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.mutate_page_trash(text, uuid, uuid)
  TO service_role;
