-- Serialize all membership mutations per KB space so concurrent requests cannot
-- both remove/demote the last direct admin. The API service role is the only
-- caller; browser roles retain no direct write path into tet_kb.

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
  changed_membership tet_kb.memberships%ROWTYPE;
BEGIN
  IF p_action NOT IN ('upsert', 'update', 'remove') THEN
    RETURN jsonb_build_object('status', 'invalid_action', 'membership', NULL);
  END IF;
  IF p_action <> 'remove' AND p_role NOT IN ('viewer', 'editor', 'admin') THEN
    RETURN jsonb_build_object('status', 'invalid_role', 'membership', NULL);
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
  WHERE space.id = p_space_id;

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
