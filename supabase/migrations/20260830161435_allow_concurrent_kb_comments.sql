-- Comment writes only need to coexist with other comment writes. Shared locks
-- preserve membership/page-lifecycle ordering without serializing a whole
-- space's discussion traffic.
CREATE OR REPLACE FUNCTION tet_kb.create_comment_for_member(
  p_page_id uuid,
  p_actor_user_id uuid,
  p_version_id uuid,
  p_parent_id uuid,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  target_space_id uuid;
  target_organization_id uuid;
  page_status text;
  published_version_id uuid;
  actor_role text;
  parent_version_id uuid;
  created_comment tet_kb.comments%ROWTYPE;
BEGIN
  IF p_content IS NULL OR length(p_content) NOT BETWEEN 1 AND 2000 THEN
    RETURN jsonb_build_object('status', 'invalid_content', 'comment', NULL);
  END IF;

  SELECT page.space_id
  INTO target_space_id
  FROM tet_kb.pages page
  LEFT JOIN tet_kb.trash deleted ON deleted.page_id = page.id
  WHERE page.id = p_page_id
    AND deleted.page_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'comment', NULL);
  END IF;

  -- Shared variants keep the established lock order while allowing multiple
  -- comments in the same space to proceed concurrently.
  PERFORM pg_advisory_xact_lock_shared(
    hashtextextended('tet_kb:space:' || target_space_id::text, 0)
  );

  SELECT space.organization_id
  INTO target_organization_id
  FROM tet_kb.spaces space
  WHERE space.id = target_space_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'comment', NULL);
  END IF;

  IF target_organization_id IS NOT NULL THEN
    PERFORM 1
    FROM tet_kb.organizations organization
    WHERE organization.id = target_organization_id
    FOR SHARE;
  END IF;

  PERFORM pg_advisory_xact_lock_shared(
    hashtextextended('tet_kb:page-tree:' || target_space_id::text, 0)
  );

  SELECT
    page.status,
    page.published_version_id,
    COALESCE(
      direct_membership.role,
      CASE
        WHEN organization_membership.role IN ('admin', 'owner') THEN 'admin'
        WHEN organization_membership.role = 'member' THEN 'viewer'
      END
    )
  INTO page_status, published_version_id, actor_role
  FROM tet_kb.pages page
  JOIN tet_kb.spaces space ON space.id = page.space_id
  LEFT JOIN tet_kb.trash deleted ON deleted.page_id = page.id
  LEFT JOIN tet_kb.memberships direct_membership
    ON direct_membership.space_id = page.space_id
   AND direct_membership.user_id = p_actor_user_id
  LEFT JOIN tet_kb.organization_memberships organization_membership
    ON organization_membership.organization_id = space.organization_id
   AND organization_membership.user_id = p_actor_user_id
  WHERE page.id = p_page_id
    AND page.space_id = target_space_id
    AND deleted.page_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'comment', NULL);
  END IF;
  IF actor_role IS NULL THEN
    RETURN jsonb_build_object('status', 'not_member', 'comment', NULL);
  END IF;
  IF actor_role = 'viewer' AND page_status <> 'published' THEN
    RETURN jsonb_build_object('status', 'requires_editor', 'comment', NULL);
  END IF;
  IF actor_role = 'viewer' AND published_version_id IS NULL THEN
    RETURN jsonb_build_object('status', 'published_version_not_found', 'comment', NULL);
  END IF;

  IF p_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM tet_kb.page_versions version
    WHERE version.id = p_version_id
      AND version.page_id = p_page_id
  ) THEN
    RETURN jsonb_build_object('status', 'invalid_version', 'comment', NULL);
  END IF;
  IF actor_role = 'viewer'
     AND p_version_id IS NOT NULL
     AND p_version_id IS DISTINCT FROM published_version_id THEN
    RETURN jsonb_build_object('status', 'viewer_version_forbidden', 'comment', NULL);
  END IF;

  IF p_parent_id IS NOT NULL THEN
    SELECT parent.version_id
    INTO parent_version_id
    FROM tet_kb.comments parent
    WHERE parent.id = p_parent_id
      AND parent.page_id = p_page_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'invalid_parent', 'comment', NULL);
    END IF;
    IF actor_role = 'viewer'
       AND parent_version_id IS NOT NULL
       AND parent_version_id IS DISTINCT FROM published_version_id THEN
      RETURN jsonb_build_object('status', 'viewer_parent_forbidden', 'comment', NULL);
    END IF;
  END IF;

  INSERT INTO tet_kb.comments (
    page_id,
    version_id,
    parent_id,
    content,
    author_id
  )
  VALUES (
    p_page_id,
    p_version_id,
    p_parent_id,
    p_content,
    p_actor_user_id
  )
  RETURNING * INTO created_comment;

  RETURN jsonb_build_object(
    'status', 'success',
    'comment', to_jsonb(created_comment)
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.create_comment_for_member(
  uuid, uuid, uuid, uuid, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.create_comment_for_member(
  uuid, uuid, uuid, uuid, text
) TO service_role;
