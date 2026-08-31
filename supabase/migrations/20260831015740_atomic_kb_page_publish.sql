-- Fetch a publish source and authorize its editor in one read-only snapshot.
-- The hash covers both markdown and editor JSON so JSON-only autosaves cannot
-- race through the later publish compare-and-set.
CREATE OR REPLACE FUNCTION tet_kb.get_publish_source_for_editor(
  p_page_id uuid,
  p_version_id uuid,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  actor_role text;
  source_content_md text;
  source_hash text;
BEGIN
  SELECT COALESCE(
    direct_membership.role,
    CASE
      WHEN organization_membership.role IN ('admin', 'owner') THEN 'admin'
      WHEN organization_membership.role = 'member' THEN 'viewer'
    END
  )
  INTO actor_role
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
    AND deleted.page_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'source', NULL);
  END IF;
  IF actor_role IS NULL THEN
    RETURN jsonb_build_object('status', 'not_member', 'source', NULL);
  END IF;
  IF actor_role NOT IN ('editor', 'admin') THEN
    RETURN jsonb_build_object('status', 'requires_editor', 'source', NULL);
  END IF;

  SELECT
    version.content_md,
    md5(jsonb_build_array(version.content_md, version.content_json)::text)
  INTO source_content_md, source_hash
  FROM tet_kb.page_versions version
  WHERE version.id = p_version_id
    AND version.page_id = p_page_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'source_not_found', 'source', NULL);
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'source', jsonb_build_object(
      'content_md', source_content_md,
      'content_hash', source_hash
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.get_publish_source_for_editor(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.get_publish_source_for_editor(uuid, uuid, uuid)
  TO service_role;

-- Re-authorize after markdown compilation and publish one immutable snapshot.
-- No external work occurs while locks are held.
CREATE OR REPLACE FUNCTION tet_kb.publish_page_version_for_editor(
  p_page_id uuid,
  p_source_version_id uuid,
  p_source_content_hash text,
  p_rendered_html text,
  p_toc_json jsonb,
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
  actor_role text;
  source_content_md text;
  source_content_json jsonb;
  source_summary text;
  source_created_by uuid;
  current_source_hash text;
  published_snapshot_id uuid;
  updated_page tet_kb.pages%ROWTYPE;
  page_result jsonb;
BEGIN
  IF p_source_content_hash IS NULL OR p_source_content_hash !~ '^[0-9a-f]{32}$' THEN
    RETURN jsonb_build_object('status', 'source_changed', 'page', NULL);
  END IF;
  IF p_rendered_html IS NULL OR length(p_rendered_html) > 5000000 THEN
    RETURN jsonb_build_object('status', 'invalid_rendered_output', 'page', NULL);
  END IF;
  IF p_toc_json IS NULL OR jsonb_typeof(p_toc_json) <> 'array' THEN
    RETURN jsonb_build_object('status', 'invalid_rendered_output', 'page', NULL);
  END IF;
  IF jsonb_array_length(p_toc_json) > 10000 THEN
    RETURN jsonb_build_object('status', 'invalid_rendered_output', 'page', NULL);
  END IF;

  SELECT page.space_id
  INTO target_space_id
  FROM tet_kb.pages page
  LEFT JOIN tet_kb.trash deleted ON deleted.page_id = page.id
  WHERE page.id = p_page_id
    AND deleted.page_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'page', NULL);
  END IF;

  PERFORM pg_advisory_xact_lock_shared(
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
    FOR SHARE;
  END IF;

  PERFORM pg_advisory_xact_lock_shared(
    hashtextextended('tet_kb:page-tree:' || target_space_id::text, 0)
  );

  SELECT COALESCE(
    direct_membership.role,
    CASE
      WHEN organization_membership.role IN ('admin', 'owner') THEN 'admin'
      WHEN organization_membership.role = 'member' THEN 'viewer'
    END
  )
  INTO actor_role
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
    RETURN jsonb_build_object('status', 'page_not_found', 'page', NULL);
  END IF;
  IF actor_role IS NULL THEN
    RETURN jsonb_build_object('status', 'not_member', 'page', NULL);
  END IF;
  IF actor_role NOT IN ('editor', 'admin') THEN
    RETURN jsonb_build_object('status', 'requires_editor', 'page', NULL);
  END IF;

  SELECT
    version.content_md,
    version.content_json,
    version.summary,
    version.created_by,
    md5(jsonb_build_array(version.content_md, version.content_json)::text)
  INTO
    source_content_md,
    source_content_json,
    source_summary,
    source_created_by,
    current_source_hash
  FROM tet_kb.page_versions version
  WHERE version.id = p_source_version_id
    AND version.page_id = p_page_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'source_not_found', 'page', NULL);
  END IF;
  IF current_source_hash IS DISTINCT FROM p_source_content_hash THEN
    RETURN jsonb_build_object('status', 'source_changed', 'page', NULL);
  END IF;

  INSERT INTO tet_kb.page_versions (
    page_id,
    content_md,
    content_json,
    summary,
    rendered_html,
    toc_json,
    created_by
  )
  VALUES (
    p_page_id,
    source_content_md,
    source_content_json,
    CASE WHEN source_summary = 'Auto-save' THEN 'Published snapshot' ELSE source_summary END,
    p_rendered_html,
    p_toc_json,
    source_created_by
  )
  RETURNING page_versions.id INTO published_snapshot_id;

  UPDATE tet_kb.pages page
  SET current_version_id = published_snapshot_id,
      published_version_id = published_snapshot_id,
      published_title = page.title,
      published_updated_at = NOW(),
      updated_at = NOW(),
      status = 'published'
  WHERE page.id = p_page_id
  RETURNING * INTO updated_page;

  page_result := to_jsonb(updated_page) || jsonb_build_object(
    'path', updated_page.path::text
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'page', page_result
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.publish_page_version_for_editor(
  uuid, uuid, text, text, jsonb, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.publish_page_version_for_editor(
  uuid, uuid, text, text, jsonb, uuid
) TO service_role;
