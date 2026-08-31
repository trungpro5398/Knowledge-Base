-- Authorize and apply a bounded page-tree reorder as one set-based mutation.
-- The function is service-role only; browser roles keep using the API.
CREATE OR REPLACE FUNCTION tet_kb.reorder_pages_for_editor(
  p_space_id uuid,
  p_actor_user_id uuid,
  p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  target_organization_id uuid;
  actor_role text;
  requested_count integer;
  matched_count integer;
  total_page_count integer;
  final_tree_count integer;
  path_changed_count integer := 0;
  affects_published boolean := false;
BEGIN
  IF p_updates IS NULL
     OR jsonb_typeof(p_updates) <> 'array'
     OR jsonb_array_length(p_updates) NOT BETWEEN 1 AND 50
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements(p_updates) item
       WHERE jsonb_typeof(item) <> 'object'
          OR jsonb_typeof(item -> 'id') <> 'string'
          OR jsonb_typeof(item -> 'sort_order') <> 'number'
          OR (
            item ? 'parent_id'
            AND jsonb_typeof(item -> 'parent_id') NOT IN ('string', 'null')
          )
          OR (item - 'id' - 'sort_order' - 'parent_id') <> '{}'::jsonb
     ) THEN
    RETURN jsonb_build_object('status', 'invalid_updates');
  END IF;

  requested_count := jsonb_array_length(p_updates);

  -- Cast and validate before taking database locks. The API performs the same
  -- checks, but the SECURITY DEFINER boundary must also defend itself.
  BEGIN
    WITH requested AS (
      SELECT
        (item ->> 'id')::uuid AS id,
        (item ->> 'sort_order')::integer AS sort_order
      FROM jsonb_array_elements(p_updates) item
    )
    SELECT COUNT(DISTINCT requested.id)
    INTO matched_count
    FROM requested
    WHERE requested.sort_order BETWEEN 0 AND 1000000;
  EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RETURN jsonb_build_object('status', 'invalid_updates');
  END;

  IF matched_count <> requested_count THEN
    RETURN jsonb_build_object('status', 'invalid_updates');
  END IF;

  -- Membership mutations and every structural page mutation use this lock
  -- order: space, organization row, then page tree.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('tet_kb:space:' || p_space_id::text, 0)
  );

  SELECT space.organization_id
  INTO target_organization_id
  FROM tet_kb.spaces space
  WHERE space.id = p_space_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_member');
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
  WHERE space.id = p_space_id;

  IF actor_role IS NULL THEN
    RETURN jsonb_build_object('status', 'not_member');
  END IF;
  IF actor_role NOT IN ('editor', 'admin') THEN
    RETURN jsonb_build_object('status', 'requires_editor');
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('tet_kb:page-tree:' || p_space_id::text, 0)
  );

  WITH requested AS (
    SELECT
      (item ->> 'id')::uuid AS id
    FROM jsonb_array_elements(p_updates) item
  )
  SELECT COUNT(*)
  INTO matched_count
  FROM requested
  JOIN tet_kb.pages page
    ON page.id = requested.id
   AND page.space_id = p_space_id
  LEFT JOIN tet_kb.trash deleted ON deleted.page_id = page.id
  WHERE deleted.page_id IS NULL;

  IF matched_count <> requested_count THEN
    RETURN jsonb_build_object('status', 'page_not_found');
  END IF;

  -- A supplied parent must be an active page in the same space. Missing
  -- parent_id is distinct from an explicit null parent_id.
  IF EXISTS (
    WITH requested AS (
      SELECT
        item ? 'parent_id' AS parent_set,
        CASE
          WHEN item ? 'parent_id' THEN (item ->> 'parent_id')::uuid
          ELSE NULL
        END AS parent_id
      FROM jsonb_array_elements(p_updates) item
    )
    SELECT 1
    FROM requested
    LEFT JOIN tet_kb.pages parent
      ON parent.id = requested.parent_id
     AND parent.space_id = p_space_id
    LEFT JOIN tet_kb.trash deleted ON deleted.page_id = parent.id
    WHERE requested.parent_set
      AND requested.parent_id IS NOT NULL
      AND (parent.id IS NULL OR deleted.page_id IS NOT NULL)
  ) THEN
    RETURN jsonb_build_object('status', 'invalid_parent');
  END IF;

  -- Rebuild the prospective tree from its roots. Any cycle makes at least one
  -- component unreachable, so the row counts differ without an unbounded walk.
  WITH RECURSIVE requested AS (
    SELECT
      (item ->> 'id')::uuid AS id,
      item ? 'parent_id' AS parent_set,
      CASE
        WHEN item ? 'parent_id' THEN (item ->> 'parent_id')::uuid
        ELSE NULL
      END AS parent_id
    FROM jsonb_array_elements(p_updates) item
  ), final_edges AS (
    SELECT
      page.id,
      page.slug,
      CASE WHEN requested.parent_set THEN requested.parent_id ELSE page.parent_id END AS parent_id
    FROM tet_kb.pages page
    LEFT JOIN requested ON requested.id = page.id
    WHERE page.space_id = p_space_id
  ), final_tree AS (
    SELECT
      edge.id,
      edge.parent_id,
      edge.slug::tet_kb.ltree AS new_path,
      ARRAY[edge.id]::uuid[] AS visited
    FROM final_edges edge
    WHERE edge.parent_id IS NULL

    UNION ALL

    SELECT
      child.id,
      child.parent_id,
      parent.new_path || child.slug::tet_kb.ltree,
      parent.visited || child.id
    FROM final_edges child
    JOIN final_tree parent ON parent.id = child.parent_id
    WHERE NOT child.id = ANY(parent.visited)
  )
  SELECT
    (SELECT COUNT(*) FROM final_edges),
    (SELECT COUNT(*) FROM final_tree)
  INTO total_page_count, final_tree_count;

  IF final_tree_count <> total_page_count THEN
    RETURN jsonb_build_object('status', 'cyclic_parent');
  END IF;

  -- Reject duplicate final paths before mutating. This also turns sibling slug
  -- collisions into a stable API result rather than leaking a constraint error.
  IF EXISTS (
    WITH RECURSIVE requested AS (
      SELECT
        (item ->> 'id')::uuid AS id,
        item ? 'parent_id' AS parent_set,
        CASE
          WHEN item ? 'parent_id' THEN (item ->> 'parent_id')::uuid
          ELSE NULL
        END AS parent_id
      FROM jsonb_array_elements(p_updates) item
    ), final_edges AS (
      SELECT
        page.id,
        page.slug,
        CASE WHEN requested.parent_set THEN requested.parent_id ELSE page.parent_id END AS parent_id
      FROM tet_kb.pages page
      LEFT JOIN requested ON requested.id = page.id
      WHERE page.space_id = p_space_id
    ), final_tree AS (
      SELECT edge.id, edge.parent_id, edge.slug::tet_kb.ltree AS new_path
      FROM final_edges edge
      WHERE edge.parent_id IS NULL

      UNION ALL

      SELECT child.id, child.parent_id, parent.new_path || child.slug::tet_kb.ltree
      FROM final_edges child
      JOIN final_tree parent ON parent.id = child.parent_id
    )
    SELECT 1
    FROM final_tree
    GROUP BY final_tree.new_path
    HAVING COUNT(*) > 1
  ) THEN
    RETURN jsonb_build_object('status', 'path_conflict');
  END IF;

  WITH RECURSIVE requested AS (
    SELECT
      (item ->> 'id')::uuid AS id,
      (item ->> 'sort_order')::integer AS sort_order,
      item ? 'parent_id' AS parent_set,
      CASE
        WHEN item ? 'parent_id' THEN (item ->> 'parent_id')::uuid
        ELSE NULL
      END AS parent_id
    FROM jsonb_array_elements(p_updates) item
  ), final_edges AS (
    SELECT
      page.id,
      page.slug,
      page.path AS old_path,
      CASE WHEN requested.parent_set THEN requested.parent_id ELSE page.parent_id END AS parent_id,
      requested.sort_order AS requested_sort_order
    FROM tet_kb.pages page
    LEFT JOIN requested ON requested.id = page.id
    WHERE page.space_id = p_space_id
  ), final_tree AS (
    SELECT
      edge.id,
      edge.parent_id,
      edge.old_path,
      edge.requested_sort_order,
      edge.slug::tet_kb.ltree AS new_path
    FROM final_edges edge
    WHERE edge.parent_id IS NULL

    UNION ALL

    SELECT
      child.id,
      child.parent_id,
      child.old_path,
      child.requested_sort_order,
      parent.new_path || child.slug::tet_kb.ltree
    FROM final_edges child
    JOIN final_tree parent ON parent.id = child.parent_id
  )
  SELECT
    COUNT(*) FILTER (WHERE final_tree.old_path IS DISTINCT FROM final_tree.new_path),
    EXISTS (
      SELECT 1
      FROM final_tree candidate
      JOIN tet_kb.pages page ON page.id = candidate.id
      LEFT JOIN tet_kb.trash deleted ON deleted.page_id = page.id
      WHERE deleted.page_id IS NULL
        AND page.status = 'published'
        AND page.published_version_id IS NOT NULL
        AND (
          candidate.old_path IS DISTINCT FROM candidate.new_path
          OR (
            candidate.requested_sort_order IS NOT NULL
            AND candidate.requested_sort_order IS DISTINCT FROM page.sort_order
          )
        )
    )
  INTO path_changed_count, affects_published
  FROM final_tree;

  BEGIN
    IF path_changed_count > 0 THEN
      -- Move changed rows through transaction-unique paths first. This makes
      -- valid sibling swaps safe with the existing immediate UNIQUE constraint.
      WITH RECURSIVE requested AS (
        SELECT
          (item ->> 'id')::uuid AS id,
          item ? 'parent_id' AS parent_set,
          CASE
            WHEN item ? 'parent_id' THEN (item ->> 'parent_id')::uuid
            ELSE NULL
          END AS parent_id
        FROM jsonb_array_elements(p_updates) item
      ), final_edges AS (
        SELECT
          page.id,
          page.slug,
          page.path AS old_path,
          CASE WHEN requested.parent_set THEN requested.parent_id ELSE page.parent_id END AS parent_id
        FROM tet_kb.pages page
        LEFT JOIN requested ON requested.id = page.id
        WHERE page.space_id = p_space_id
      ), final_tree AS (
        SELECT edge.id, edge.parent_id, edge.old_path, edge.slug::tet_kb.ltree AS new_path
        FROM final_edges edge
        WHERE edge.parent_id IS NULL

        UNION ALL

        SELECT child.id, child.parent_id, child.old_path, parent.new_path || child.slug::tet_kb.ltree
        FROM final_edges child
        JOIN final_tree parent ON parent.id = child.parent_id
      )
      UPDATE tet_kb.pages page
      SET path = (
        '_kbtmp_' || replace(page.id::text, '-', '_') || '_' || txid_current()::text
      )::tet_kb.ltree
      FROM final_tree
      WHERE page.id = final_tree.id
        AND final_tree.old_path IS DISTINCT FROM final_tree.new_path;

      WITH RECURSIVE requested AS (
        SELECT
          (item ->> 'id')::uuid AS id,
          item ? 'parent_id' AS parent_set,
          CASE
            WHEN item ? 'parent_id' THEN (item ->> 'parent_id')::uuid
            ELSE NULL
          END AS parent_id
        FROM jsonb_array_elements(p_updates) item
      ), final_edges AS (
        SELECT
          page.id,
          page.slug,
          CASE WHEN requested.parent_set THEN requested.parent_id ELSE page.parent_id END AS parent_id
        FROM tet_kb.pages page
        LEFT JOIN requested ON requested.id = page.id
        WHERE page.space_id = p_space_id
      ), final_tree AS (
        SELECT edge.id, edge.parent_id, edge.slug::tet_kb.ltree AS new_path
        FROM final_edges edge
        WHERE edge.parent_id IS NULL

        UNION ALL

        SELECT child.id, child.parent_id, parent.new_path || child.slug::tet_kb.ltree
        FROM final_edges child
        JOIN final_tree parent ON parent.id = child.parent_id
      )
      UPDATE tet_kb.pages page
      SET path = final_tree.new_path,
          updated_at = NOW(),
          published_updated_at = CASE
            WHEN page.status = 'published'
              AND page.published_version_id IS NOT NULL
              THEN NOW()
            ELSE page.published_updated_at
          END
      FROM final_tree
      WHERE page.id = final_tree.id
        AND page.path IS DISTINCT FROM final_tree.new_path;
    END IF;

    WITH requested AS (
      SELECT
        (item ->> 'id')::uuid AS id,
        (item ->> 'sort_order')::integer AS sort_order,
        item ? 'parent_id' AS parent_set,
        CASE
          WHEN item ? 'parent_id' THEN (item ->> 'parent_id')::uuid
          ELSE NULL
        END AS parent_id
      FROM jsonb_array_elements(p_updates) item
    )
    UPDATE tet_kb.pages page
    SET parent_id = CASE WHEN requested.parent_set THEN requested.parent_id ELSE page.parent_id END,
        sort_order = requested.sort_order,
        updated_by = p_actor_user_id,
        updated_at = NOW(),
        published_updated_at = CASE
          WHEN page.sort_order IS DISTINCT FROM requested.sort_order
            AND page.status = 'published'
            AND page.published_version_id IS NOT NULL
            THEN NOW()
          ELSE page.published_updated_at
        END
    FROM requested
    WHERE page.id = requested.id
      AND page.space_id = p_space_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('status', 'path_conflict');
  END;

  RETURN jsonb_build_object(
    'status', 'success',
    'affected_count', requested_count,
    'path_changed_count', path_changed_count,
    'affects_published', affects_published
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.reorder_pages_for_editor(uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.reorder_pages_for_editor(uuid, uuid, jsonb)
  TO service_role;

-- Page creation participates in the same structural lock as reorder, move,
-- trash and purge. The parent path cannot become stale between validation and
-- INSERT when a concurrent tree mutation is in flight.
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

  PERFORM pg_advisory_xact_lock(
    hashtextextended('tet_kb:page-tree:' || p_space_id::text, 0)
  );

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
