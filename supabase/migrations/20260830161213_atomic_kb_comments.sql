-- Read a visible comment thread and its authorization snapshot in one call.
-- Browser roles cannot invoke this service-only helper directly.
CREATE OR REPLACE FUNCTION tet_kb.list_comments_for_member(
  p_page_id uuid,
  p_actor_user_id uuid,
  p_limit integer,
  p_cursor_created_at timestamptz,
  p_cursor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  page_status text;
  published_version_id uuid;
  actor_role text;
  visible_comments jsonb;
  has_more boolean;
BEGIN
  IF p_limit IS NULL
     OR p_limit NOT BETWEEN 1 AND 100
     OR (p_cursor_created_at IS NULL) <> (p_cursor_id IS NULL) THEN
    RETURN jsonb_build_object(
      'status', 'invalid_cursor',
      'comments', '[]'::jsonb,
      'has_more', false
    );
  END IF;

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
    AND deleted.page_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'page_not_found',
      'comments', '[]'::jsonb,
      'has_more', false
    );
  END IF;
  IF actor_role IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'not_member',
      'comments', '[]'::jsonb,
      'has_more', false
    );
  END IF;
  IF actor_role = 'viewer' AND page_status <> 'published' THEN
    RETURN jsonb_build_object(
      'status', 'requires_editor',
      'comments', '[]'::jsonb,
      'has_more', false
    );
  END IF;

  WITH candidates AS (
    SELECT
      comment.*,
      to_char(
        comment.created_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
      ) AS created_at_text
    FROM tet_kb.comments comment
    WHERE comment.page_id = p_page_id
      AND (
        actor_role <> 'viewer'
        OR (
          published_version_id IS NOT NULL
          AND (
            comment.version_id IS NULL
            OR comment.version_id = published_version_id
          )
        )
      )
      AND (
        p_cursor_created_at IS NULL
        OR (comment.created_at, comment.id) > (p_cursor_created_at, p_cursor_id)
      )
    ORDER BY comment.created_at, comment.id
    LIMIT p_limit + 1
  ), numbered AS (
    SELECT
      candidates.*,
      row_number() OVER (ORDER BY candidates.created_at, candidates.id) AS result_number
    FROM candidates
  )
  SELECT
    COALESCE(
      jsonb_agg(
        to_jsonb(numbered) - 'result_number'
        ORDER BY numbered.created_at, numbered.id
      ) FILTER (WHERE numbered.result_number <= p_limit),
      '[]'::jsonb
    ),
    COUNT(*) > p_limit
  INTO visible_comments, has_more
  FROM numbered;

  RETURN jsonb_build_object(
    'status', 'success',
    'comments', visible_comments,
    'has_more', has_more
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.list_comments_for_member(
  uuid, uuid, integer, timestamptz, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.list_comments_for_member(
  uuid, uuid, integer, timestamptz, uuid
) TO service_role;

-- Authorize page visibility, validate version/thread ownership and insert the
-- comment in one short transaction. This closes membership and page-trash
-- races between route middleware and the write.
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

  -- Match the mutation lock order used by memberships and page lifecycle:
  -- space, organization row, then page tree.
  PERFORM pg_advisory_xact_lock(
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
    FOR UPDATE;
  END IF;

  PERFORM pg_advisory_xact_lock(
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
