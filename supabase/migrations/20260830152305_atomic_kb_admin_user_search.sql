-- Authorize member-management searches and read auth.users in one database
-- snapshot. The API service role is the only caller, preventing this helper
-- from becoming a browser-accessible user enumeration endpoint.
CREATE OR REPLACE FUNCTION tet_kb.search_users_for_admin(
  p_search_term text,
  p_limit integer,
  p_organization_id uuid,
  p_space_id uuid,
  p_page_id uuid,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  page_space_id uuid;
  actor_role text;
  matched_users jsonb;
BEGIN
  IF p_organization_id IS NULL AND p_space_id IS NULL AND p_page_id IS NULL THEN
    RETURN jsonb_build_object('status', 'forbidden', 'users', '[]'::jsonb);
  END IF;

  IF p_organization_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM tet_kb.organization_memberships membership
    JOIN tet_kb.organizations organization
      ON organization.id = membership.organization_id
     AND organization.deleted_at IS NULL
    WHERE membership.organization_id = p_organization_id
      AND membership.user_id = p_actor_user_id
      AND membership.role IN ('admin', 'owner')
  ) THEN
    RETURN jsonb_build_object('status', 'organization_forbidden', 'users', '[]'::jsonb);
  END IF;

  IF p_space_id IS NOT NULL THEN
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

    IF actor_role IS DISTINCT FROM 'admin' THEN
      RETURN jsonb_build_object('status', 'space_forbidden', 'users', '[]'::jsonb);
    END IF;
  END IF;

  IF p_page_id IS NOT NULL THEN
    SELECT page.space_id
    INTO page_space_id
    FROM tet_kb.pages page
    WHERE page.id = p_page_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'page_not_found', 'users', '[]'::jsonb);
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
    WHERE space.id = page_space_id;

    IF actor_role IS DISTINCT FROM 'admin' THEN
      RETURN jsonb_build_object('status', 'page_forbidden', 'users', '[]'::jsonb);
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(candidate) ORDER BY lower(candidate.email)), '[]'::jsonb)
  INTO matched_users
  FROM (
    SELECT
      auth_user.id,
      auth_user.email,
      auth_user.raw_user_meta_data->>'name' AS name
    FROM auth.users auth_user
    WHERE (
      auth_user.email ILIKE p_search_term ESCAPE '\'
      OR COALESCE(auth_user.raw_user_meta_data->>'name', '') ILIKE p_search_term ESCAPE '\'
    )
      AND (
        p_organization_id IS NULL OR NOT EXISTS (
          SELECT 1
          FROM tet_kb.organization_memberships membership
          WHERE membership.organization_id = p_organization_id
            AND membership.user_id = auth_user.id
        )
      )
      AND (
        p_organization_id IS NULL OR NOT EXISTS (
          SELECT 1
          FROM tet_kb.memberships membership
          JOIN tet_kb.spaces space ON space.id = membership.space_id
          WHERE space.organization_id = p_organization_id
            AND membership.user_id = auth_user.id
        )
      )
      AND (
        p_organization_id IS NULL OR NOT EXISTS (
          SELECT 1
          FROM tet_kb.watchers watcher
          JOIN tet_kb.pages page ON page.id = watcher.page_id
          JOIN tet_kb.spaces space ON space.id = page.space_id
          WHERE space.organization_id = p_organization_id
            AND watcher.user_id = auth_user.id
        )
      )
      AND (
        p_space_id IS NULL OR NOT EXISTS (
          SELECT 1
          FROM tet_kb.memberships membership
          WHERE membership.space_id = p_space_id
            AND membership.user_id = auth_user.id
        )
      )
      AND (
        p_space_id IS NULL OR NOT EXISTS (
          SELECT 1
          FROM tet_kb.watchers watcher
          JOIN tet_kb.pages page ON page.id = watcher.page_id
          WHERE page.space_id = p_space_id
            AND watcher.user_id = auth_user.id
        )
      )
      AND (
        p_page_id IS NULL OR NOT EXISTS (
          SELECT 1
          FROM tet_kb.watchers watcher
          WHERE watcher.page_id = p_page_id
            AND watcher.user_id = auth_user.id
        )
      )
      AND (
        p_page_id IS NULL OR NOT EXISTS (
          SELECT 1
          FROM tet_kb.pages page
          JOIN tet_kb.memberships membership ON membership.space_id = page.space_id
          WHERE page.id = p_page_id
            AND membership.user_id = auth_user.id
        )
      )
    ORDER BY lower(auth_user.email)
    LIMIT LEAST(GREATEST(p_limit, 1), 20)
  ) candidate;

  RETURN jsonb_build_object(
    'status', 'success',
    'users', matched_users
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.search_users_for_admin(
  text, integer, uuid, uuid, uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.search_users_for_admin(
  text, integer, uuid, uuid, uuid, uuid
) TO service_role;
