-- Authorize page creation, validate its parent, allocate sibling order and
-- optionally snapshot a template in one short transaction. Browser roles do
-- not receive direct access to this helper.
CREATE OR REPLACE FUNCTION tet_kb.create_page_for_editor(
  p_space_id uuid,
  p_parent_id uuid,
  p_title text,
  p_slug text,
  p_template_id uuid,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  target_organization_id uuid;
  actor_role text;
  parent_path tet_kb.ltree;
  template_content text;
  next_sort_order integer;
  created_page tet_kb.pages%ROWTYPE;
  created_version tet_kb.page_versions%ROWTYPE;
  page_result jsonb;
BEGIN
  -- Coordinate with direct membership mutations before reading the actor role.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('tet_kb:space:' || p_space_id::text, 0)
  );

  SELECT space.organization_id
  INTO target_organization_id
  FROM tet_kb.spaces space
  WHERE space.id = p_space_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_member', 'page', NULL);
  END IF;

  -- Organization membership mutations use this row lock. No external work is
  -- performed while it is held.
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
  WHERE space.id = p_space_id;

  IF actor_role IS NULL THEN
    RETURN jsonb_build_object('status', 'not_member', 'page', NULL);
  END IF;
  IF actor_role NOT IN ('editor', 'admin') THEN
    RETURN jsonb_build_object('status', 'requires_editor', 'page', NULL);
  END IF;

  IF p_parent_id IS NOT NULL THEN
    SELECT parent.path
    INTO parent_path
    FROM tet_kb.pages parent
    LEFT JOIN tet_kb.trash deleted ON deleted.page_id = parent.id
    WHERE parent.id = p_parent_id
      AND parent.space_id = p_space_id
      AND deleted.page_id IS NULL;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'invalid_parent', 'page', NULL);
    END IF;
  END IF;

  -- Serialize sibling appends so concurrent creates receive stable order.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'tet_kb:page-parent:' || p_space_id::text || ':' || COALESCE(p_parent_id::text, 'root'),
      0
    )
  );

  SELECT COALESCE(MAX(page.sort_order), -1) + 1
  INTO next_sort_order
  FROM tet_kb.pages page
  WHERE page.space_id = p_space_id
    AND page.parent_id IS NOT DISTINCT FROM p_parent_id;

  BEGIN
    INSERT INTO tet_kb.pages (
      space_id,
      parent_id,
      slug,
      path,
      title,
      status,
      sort_order,
      created_by,
      updated_by
    )
    VALUES (
      p_space_id,
      p_parent_id,
      p_slug,
      CASE
        WHEN p_parent_id IS NULL THEN p_slug::tet_kb.ltree
        ELSE parent_path || p_slug::tet_kb.ltree
      END,
      p_title,
      'draft',
      next_sort_order,
      p_actor_user_id,
      p_actor_user_id
    )
    RETURNING * INTO created_page;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('status', 'path_conflict', 'page', NULL);
  END;

  IF p_template_id IS NOT NULL THEN
    SELECT template.content_md
    INTO template_content
    FROM tet_kb.page_templates template
    WHERE template.id = p_template_id
      AND template.space_id = p_space_id;
  END IF;

  IF COALESCE(template_content, '') <> '' THEN
    INSERT INTO tet_kb.page_versions (
      page_id,
      content_md,
      content_json,
      summary,
      created_by
    )
    VALUES (
      created_page.id,
      template_content,
      NULL,
      NULL,
      p_actor_user_id
    )
    RETURNING * INTO created_version;

    UPDATE tet_kb.pages page
    SET current_version_id = created_version.id,
        updated_at = NOW()
    WHERE page.id = created_page.id
    RETURNING * INTO created_page;
  END IF;

  page_result := to_jsonb(created_page);
  IF created_version.id IS NOT NULL THEN
    page_result := page_result || jsonb_build_object(
      'version', jsonb_build_object(
        'id', created_version.id,
        'page_id', created_version.page_id,
        'content_md', created_version.content_md,
        'content_json', created_version.content_json,
        'summary', created_version.summary,
        'rendered_html', created_version.rendered_html,
        'toc_json', created_version.toc_json,
        'created_by', created_version.created_by,
        'created_at', created_version.created_at
      )
    );
  END IF;

  RETURN jsonb_build_object('status', 'success', 'page', page_result);
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.create_page_for_editor(
  uuid, uuid, text, text, uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.create_page_for_editor(
  uuid, uuid, text, text, uuid, uuid
) TO service_role;
