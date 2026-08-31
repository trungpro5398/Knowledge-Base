-- Close two authorization gaps in the service-role-only KB mutation surface:
-- reject missing organization membership explicitly during space creation, and
-- serialize inherited-role authorization with organization role revocation.

CREATE OR REPLACE FUNCTION tet_kb.mutate_space(
  p_action text,
  p_space_id uuid,
  p_name text,
  p_slug text,
  p_icon text,
  p_description text,
  p_organization_id uuid,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  actor_role text;
  target_organization_id uuid;
  previous_slug text;
  changed_space tet_kb.spaces%ROWTYPE;
BEGIN
  IF p_action NOT IN ('create', 'update', 'delete') THEN
    RETURN jsonb_build_object('status', 'invalid_action', 'space', NULL);
  END IF;

  IF p_action = 'create' THEN
    IF p_organization_id IS NOT NULL THEN
      SELECT membership.role
      INTO actor_role
      FROM tet_kb.organizations organization
      LEFT JOIN tet_kb.organization_memberships membership
        ON membership.organization_id = organization.id
       AND membership.user_id = p_actor_user_id
      WHERE organization.id = p_organization_id
        AND organization.deleted_at IS NULL
      FOR UPDATE OF organization;

      IF NOT FOUND OR actor_role IS NULL OR actor_role NOT IN ('admin', 'owner') THEN
        RETURN jsonb_build_object('status', 'forbidden', 'space', NULL);
      END IF;
    END IF;

    BEGIN
      INSERT INTO tet_kb.spaces (
        name,
        slug,
        icon,
        description,
        organization_id
      )
      VALUES (
        p_name,
        p_slug,
        p_icon,
        p_description,
        p_organization_id
      )
      RETURNING * INTO changed_space;
    EXCEPTION
      WHEN unique_violation THEN
        RETURN jsonb_build_object('status', 'slug_conflict', 'space', NULL);
    END;

    INSERT INTO tet_kb.memberships (user_id, space_id, role)
    VALUES (p_actor_user_id, changed_space.id, 'admin');

    RETURN jsonb_build_object(
      'status', 'success',
      'space', to_jsonb(changed_space),
      'previous_slug', NULL
    );
  END IF;

  IF p_space_id IS NULL THEN
    RETURN jsonb_build_object('status', 'space_not_found', 'space', NULL);
  END IF;

  SELECT space.organization_id
  INTO target_organization_id
  FROM tet_kb.spaces space
  WHERE space.id = p_space_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'space_not_found', 'space', NULL);
  END IF;

  IF target_organization_id IS NOT NULL THEN
    PERFORM 1
    FROM tet_kb.organizations organization
    WHERE organization.id = target_organization_id
      AND organization.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'space_not_found', 'space', NULL);
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('tet_kb:space:' || p_space_id::text, 0)
  );

  SELECT
    COALESCE(
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
  WHERE space.id = p_space_id
    AND (
      direct_membership.user_id IS NOT NULL
      OR organization_membership.user_id IS NOT NULL
    )
  FOR UPDATE OF space;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'space_not_found', 'space', NULL);
  END IF;
  IF actor_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('status', 'forbidden', 'space', NULL);
  END IF;

  SELECT *
  INTO changed_space
  FROM tet_kb.spaces space
  WHERE space.id = p_space_id;

  previous_slug := changed_space.slug;

  IF p_action = 'delete' THEN
    DELETE FROM tet_kb.spaces space
    WHERE space.id = p_space_id
    RETURNING * INTO changed_space;
  ELSE
    BEGIN
      UPDATE tet_kb.spaces space
      SET name = p_name,
          slug = p_slug,
          description = p_description,
          updated_at = NOW()
      WHERE space.id = p_space_id
      RETURNING * INTO changed_space;
    EXCEPTION
      WHEN unique_violation THEN
        RETURN jsonb_build_object(
          'status', 'slug_conflict',
          'space', NULL,
          'previous_slug', previous_slug
        );
    END;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'space', to_jsonb(changed_space),
    'previous_slug', previous_slug
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.mutate_space(
  text, uuid, text, text, text, text, uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.mutate_space(
  text, uuid, text, text, text, text, uuid, uuid
) TO service_role;

CREATE OR REPLACE FUNCTION tet_kb.mutate_space_membership(
  p_action text,
  p_space_id uuid,
  p_target_user_id uuid,
  p_role text,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  actor_role text;
  target_role text;
  target_organization_id uuid;
  changed_membership tet_kb.memberships%ROWTYPE;
BEGIN
  IF p_action NOT IN ('upsert', 'update', 'remove') THEN
    RETURN jsonb_build_object('status', 'invalid_action', 'membership', NULL);
  END IF;
  IF p_action <> 'remove' AND p_role NOT IN ('viewer', 'editor', 'admin') THEN
    RETURN jsonb_build_object('status', 'invalid_role', 'membership', NULL);
  END IF;

  SELECT space.organization_id
  INTO target_organization_id
  FROM tet_kb.spaces space
  WHERE space.id = p_space_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'space_not_found', 'membership', NULL);
  END IF;

  -- Organization role mutations use the same row lock. Taking it before the
  -- space advisory lock makes the authorization read linearizable with role
  -- demotion/removal and keeps one lock order across KB membership flows.
  IF target_organization_id IS NOT NULL THEN
    PERFORM 1
    FROM tet_kb.organizations organization
    WHERE organization.id = target_organization_id
      AND organization.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'space_not_found', 'membership', NULL);
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('tet_kb:space:' || p_space_id::text, 0)
  );

  SELECT COALESCE(
    direct_membership.role::text,
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
  WHERE space.id = p_space_id
    AND space.organization_id IS NOT DISTINCT FROM target_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'space_not_found', 'membership', NULL);
  END IF;
  IF actor_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('status', 'forbidden', 'membership', NULL);
  END IF;

  SELECT membership.role::text
  INTO target_role
  FROM tet_kb.memberships membership
  WHERE membership.space_id = p_space_id
    AND membership.user_id = p_target_user_id;

  IF p_action = 'update' AND NOT FOUND THEN
    RETURN jsonb_build_object('status', 'member_not_found', 'membership', NULL);
  END IF;
  IF p_action = 'remove' AND NOT FOUND THEN
    RETURN jsonb_build_object('status', 'success', 'membership', NULL);
  END IF;

  IF target_role = 'admin'
     AND (p_action = 'remove' OR p_role <> 'admin')
     AND NOT EXISTS (
       SELECT 1
       FROM tet_kb.memberships other_admin
       WHERE other_admin.space_id = p_space_id
         AND other_admin.user_id <> p_target_user_id
         AND other_admin.role = 'admin'
     ) THEN
    RETURN jsonb_build_object('status', 'last_admin', 'membership', NULL);
  END IF;

  IF p_action = 'remove' THEN
    DELETE FROM tet_kb.memberships membership
    WHERE membership.space_id = p_space_id
      AND membership.user_id = p_target_user_id;
    RETURN jsonb_build_object('status', 'success', 'membership', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    RETURN jsonb_build_object('status', 'member_not_found', 'membership', NULL);
  END IF;

  IF p_action = 'upsert' THEN
    INSERT INTO tet_kb.memberships (space_id, user_id, role)
    VALUES (p_space_id, p_target_user_id, p_role)
    ON CONFLICT (user_id, space_id)
    DO UPDATE SET role = EXCLUDED.role
    RETURNING * INTO changed_membership;
  ELSE
    UPDATE tet_kb.memberships membership
    SET role = p_role
    WHERE membership.space_id = p_space_id
      AND membership.user_id = p_target_user_id
    RETURNING * INTO changed_membership;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'membership', to_jsonb(changed_membership)
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.mutate_space_membership(text, uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.mutate_space_membership(text, uuid, uuid, text, uuid)
  TO service_role;
