-- Authorize and save an editor version in one bounded transaction. Shared
-- lifecycle locks allow unrelated pages to autosave concurrently; the target
-- page row alone is serialized to protect its current-version pointer.
CREATE OR REPLACE FUNCTION tet_kb.save_page_version_for_editor(
  p_page_id uuid,
  p_actor_user_id uuid,
  p_content_md text,
  p_content_json jsonb,
  p_summary text,
  p_draft_update boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  target_space_id uuid;
  target_organization_id uuid;
  actor_role text;
  current_version_id uuid;
  published_version_id uuid;
  saved_version jsonb;
BEGIN
  IF p_content_md IS NULL AND p_content_json IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_content', 'version', NULL);
  END IF;
  IF p_content_md IS NOT NULL AND length(p_content_md) > 1000000 THEN
    RETURN jsonb_build_object('status', 'invalid_content', 'version', NULL);
  END IF;
  IF p_content_json IS NOT NULL AND jsonb_typeof(p_content_json) <> 'object' THEN
    RETURN jsonb_build_object('status', 'invalid_content', 'version', NULL);
  END IF;
  IF p_summary IS NOT NULL AND length(p_summary) > 500 THEN
    RETURN jsonb_build_object('status', 'invalid_summary', 'version', NULL);
  END IF;

  SELECT page.space_id
  INTO target_space_id
  FROM tet_kb.pages page
  LEFT JOIN tet_kb.trash deleted ON deleted.page_id = page.id
  WHERE page.id = p_page_id
    AND deleted.page_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'version', NULL);
  END IF;

  -- Match membership/page lifecycle lock order. Shared variants let saves on
  -- different pages proceed together while exclusive lifecycle mutations wait.
  PERFORM pg_advisory_xact_lock_shared(
    hashtextextended('tet_kb:space:' || target_space_id::text, 0)
  );

  SELECT space.organization_id
  INTO target_organization_id
  FROM tet_kb.spaces space
  WHERE space.id = target_space_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'version', NULL);
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
    page.current_version_id,
    page.published_version_id,
    COALESCE(
      direct_membership.role,
      CASE
        WHEN organization_membership.role IN ('admin', 'owner') THEN 'admin'
        WHEN organization_membership.role = 'member' THEN 'viewer'
      END
    )
  INTO current_version_id, published_version_id, actor_role
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
    AND deleted.page_id IS NULL
  FOR UPDATE OF page;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'version', NULL);
  END IF;
  IF actor_role IS NULL THEN
    RETURN jsonb_build_object('status', 'not_member', 'version', NULL);
  END IF;
  IF actor_role NOT IN ('editor', 'admin') THEN
    RETURN jsonb_build_object('status', 'requires_editor', 'version', NULL);
  END IF;

  IF COALESCE(p_draft_update, false)
     AND current_version_id IS DISTINCT FROM published_version_id THEN
    UPDATE tet_kb.page_versions version
    SET content_md = p_content_md,
        content_json = p_content_json,
        summary = 'Auto-save'
    WHERE version.id = current_version_id
      AND version.page_id = p_page_id
      AND version.summary = 'Auto-save'
    RETURNING jsonb_build_object(
      'id', version.id,
      'page_id', version.page_id,
      'summary', version.summary,
      'created_by', version.created_by,
      'created_at', version.created_at
    )
    INTO saved_version;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'status', 'success',
        'version', saved_version,
        'reused_autosave', true
      );
    END IF;
  END IF;

  INSERT INTO tet_kb.page_versions (
    page_id,
    content_md,
    content_json,
    summary,
    created_by
  )
  VALUES (
    p_page_id,
    p_content_md,
    p_content_json,
    CASE WHEN COALESCE(p_draft_update, false) THEN 'Auto-save' ELSE p_summary END,
    p_actor_user_id
  )
  RETURNING jsonb_build_object(
    'id', page_versions.id,
    'page_id', page_versions.page_id,
    'summary', page_versions.summary,
    'created_by', page_versions.created_by,
    'created_at', page_versions.created_at
  )
  INTO saved_version;

  UPDATE tet_kb.pages page
  SET current_version_id = (saved_version ->> 'id')::uuid,
      updated_at = NOW()
  WHERE page.id = p_page_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'version', saved_version,
    'reused_autosave', false
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.save_page_version_for_editor(
  uuid, uuid, text, jsonb, text, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.save_page_version_for_editor(
  uuid, uuid, text, jsonb, text, boolean
) TO service_role;
