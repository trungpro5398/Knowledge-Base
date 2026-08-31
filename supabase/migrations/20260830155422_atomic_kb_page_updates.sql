-- Keep a page's hierarchy fields, ltree path and descendant paths consistent
-- while authorizing the editor in the same short transaction.
ALTER TABLE tet_kb.pages
  ADD CONSTRAINT pages_slug_ltree_label_check
  CHECK (slug ~ '^[a-z0-9_-]+$');

CREATE OR REPLACE FUNCTION tet_kb.update_page_for_editor(
  p_page_id uuid,
  p_actor_user_id uuid,
  p_title text,
  p_title_set boolean,
  p_slug text,
  p_slug_set boolean,
  p_parent_id uuid,
  p_parent_set boolean,
  p_sort_order integer,
  p_sort_set boolean
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
  target_slug text;
  target_parent_id uuid;
  target_sort_order integer;
  target_status text;
  target_published_version_id uuid;
  actor_role text;
  parent_path tet_kb.ltree;
  next_slug text;
  next_parent_id uuid;
  next_path tet_kb.ltree;
  path_changed boolean;
  sort_changed boolean;
  affects_published boolean := false;
  updated_page tet_kb.pages%ROWTYPE;
  page_result jsonb;
BEGIN
  IF p_title_set AND (p_title IS NULL OR length(p_title) NOT BETWEEN 1 AND 500) THEN
    RETURN jsonb_build_object('status', 'invalid_title', 'page', NULL);
  END IF;
  IF p_slug_set AND (
    p_slug IS NULL
    OR length(p_slug) NOT BETWEEN 1 AND 200
    OR p_slug !~ '^[a-z0-9_-]+$'
  ) THEN
    RETURN jsonb_build_object('status', 'invalid_slug', 'page', NULL);
  END IF;
  IF p_sort_set AND (p_sort_order IS NULL OR p_sort_order NOT BETWEEN 0 AND 1000000) THEN
    RETURN jsonb_build_object('status', 'invalid_sort_order', 'page', NULL);
  END IF;

  -- Trashed pages remain indistinguishable from missing pages, matching the
  -- previous route-level authorization behavior.
  SELECT page.space_id
  INTO target_space_id
  FROM tet_kb.pages page
  LEFT JOIN tet_kb.trash deleted ON deleted.page_id = page.id
  WHERE page.id = p_page_id
    AND deleted.page_id IS NULL;

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
    page.slug,
    page.parent_id,
    page.sort_order,
    page.status,
    page.published_version_id
  INTO
    target_path,
    target_slug,
    target_parent_id,
    target_sort_order,
    target_status,
    target_published_version_id
  FROM tet_kb.pages page
  LEFT JOIN tet_kb.trash deleted ON deleted.page_id = page.id
  WHERE page.id = p_page_id
    AND page.space_id = target_space_id
    AND deleted.page_id IS NULL
  FOR UPDATE OF page;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'page_not_found', 'page', NULL);
  END IF;

  next_slug := CASE WHEN p_slug_set THEN p_slug ELSE target_slug END;
  next_parent_id := CASE WHEN p_parent_set THEN p_parent_id ELSE target_parent_id END;

  IF next_parent_id IS NOT NULL THEN
    SELECT parent.path
    INTO parent_path
    FROM tet_kb.pages parent
    LEFT JOIN tet_kb.trash deleted ON deleted.page_id = parent.id
    WHERE parent.id = next_parent_id
      AND parent.space_id = target_space_id
      AND deleted.page_id IS NULL
    FOR UPDATE OF parent;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'invalid_parent', 'page', NULL);
    END IF;
    IF parent_path <@ target_path THEN
      RETURN jsonb_build_object('status', 'cyclic_parent', 'page', NULL);
    END IF;

    next_path := parent_path || next_slug::tet_kb.ltree;
  ELSE
    next_path := next_slug::tet_kb.ltree;
  END IF;

  path_changed := next_path IS DISTINCT FROM target_path;
  sort_changed := p_sort_set AND p_sort_order IS DISTINCT FROM target_sort_order;

  IF path_changed THEN
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
  ELSIF sort_changed THEN
    affects_published := target_status = 'published'
      AND target_published_version_id IS NOT NULL;
  END IF;

  BEGIN
    IF path_changed THEN
      UPDATE tet_kb.pages page
      SET path = CASE
            WHEN page.id = p_page_id THEN next_path
            ELSE next_path || subpath(page.path, nlevel(target_path))
          END,
          updated_at = NOW(),
          published_updated_at = CASE
            WHEN page.status = 'published' AND page.published_version_id IS NOT NULL
              THEN NOW()
            ELSE page.published_updated_at
          END
      WHERE page.space_id = target_space_id
        AND page.path <@ target_path;
    END IF;

    UPDATE tet_kb.pages page
    SET title = CASE WHEN p_title_set THEN p_title ELSE page.title END,
        slug = CASE WHEN p_slug_set THEN p_slug ELSE page.slug END,
        parent_id = CASE WHEN p_parent_set THEN p_parent_id ELSE page.parent_id END,
        sort_order = CASE WHEN p_sort_set THEN p_sort_order ELSE page.sort_order END,
        updated_by = p_actor_user_id,
        updated_at = NOW(),
        published_updated_at = CASE
          WHEN sort_changed
            AND page.status = 'published'
            AND page.published_version_id IS NOT NULL
            THEN NOW()
          ELSE page.published_updated_at
        END
    WHERE page.id = p_page_id
    RETURNING * INTO updated_page;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('status', 'path_conflict', 'page', NULL);
  END;

  page_result := to_jsonb(updated_page) || jsonb_build_object(
    'path', updated_page.path::text
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'page', page_result,
    'affects_published', affects_published,
    'path_changed', path_changed
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.update_page_for_editor(
  uuid, uuid, text, boolean, text, boolean, uuid, boolean, integer, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.update_page_for_editor(
  uuid, uuid, text, boolean, text, boolean, uuid, boolean, integer, boolean
) TO service_role;
