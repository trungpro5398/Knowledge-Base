-- SQL three-valued logic makes NULL NOT IN (...) evaluate to NULL. Recreate
-- the function so users without an organization membership fail closed.

-- Keep organization membership authorization and owner invariants in one
-- short transaction. Locking the organization also coordinates with the
-- existing last-owner trigger used by direct authenticated writes.

CREATE OR REPLACE FUNCTION tet_kb.mutate_organization_membership(
  p_action text,
  p_organization_id uuid,
  p_target_user_id uuid,
  p_target_email text,
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
  resolved_target_user_id uuid := p_target_user_id;
  target_role text;
  changed_membership tet_kb.organization_memberships%ROWTYPE;
BEGIN
  IF p_action NOT IN ('upsert', 'update', 'remove') THEN
    RETURN jsonb_build_object('status', 'invalid_action', 'membership', NULL);
  END IF;
  IF p_action <> 'remove' AND p_role NOT IN ('member', 'admin', 'owner') THEN
    RETURN jsonb_build_object('status', 'invalid_role', 'membership', NULL);
  END IF;

  SELECT actor.role::text
  INTO actor_role
  FROM tet_kb.organizations organization
  LEFT JOIN tet_kb.organization_memberships actor
    ON actor.organization_id = organization.id
   AND actor.user_id = p_actor_user_id
  WHERE organization.id = p_organization_id
    AND organization.deleted_at IS NULL
  FOR UPDATE OF organization;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'organization_not_found', 'membership', NULL);
  END IF;
  IF actor_role IS NULL OR actor_role NOT IN ('admin', 'owner') THEN
    RETURN jsonb_build_object('status', 'forbidden', 'membership', NULL);
  END IF;

  IF resolved_target_user_id IS NULL AND p_action = 'upsert' THEN
    SELECT auth_user.id
    INTO resolved_target_user_id
    FROM auth.users auth_user
    WHERE lower(auth_user.email) = lower(btrim(p_target_email))
    LIMIT 1;
  END IF;
  IF resolved_target_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'member_not_found', 'membership', NULL);
  END IF;

  SELECT membership.role::text
  INTO target_role
  FROM tet_kb.organization_memberships membership
  WHERE membership.organization_id = p_organization_id
    AND membership.user_id = resolved_target_user_id;

  IF p_action IN ('update', 'remove') AND NOT FOUND THEN
    RETURN jsonb_build_object('status', 'member_not_found', 'membership', NULL);
  END IF;
  IF actor_role <> 'owner'
     AND (target_role = 'owner' OR p_role = 'owner') THEN
    RETURN jsonb_build_object('status', 'owner_required', 'membership', NULL);
  END IF;
  IF target_role = 'owner'
     AND (p_action = 'remove' OR p_role <> 'owner')
     AND NOT EXISTS (
       SELECT 1
       FROM tet_kb.organization_memberships other_owner
       WHERE other_owner.organization_id = p_organization_id
         AND other_owner.user_id <> resolved_target_user_id
         AND other_owner.role = 'owner'
     ) THEN
    RETURN jsonb_build_object('status', 'last_owner', 'membership', NULL);
  END IF;

  IF p_action = 'remove' THEN
    DELETE FROM tet_kb.organization_memberships membership
    WHERE membership.organization_id = p_organization_id
      AND membership.user_id = resolved_target_user_id;
    RETURN jsonb_build_object('status', 'success', 'membership', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = resolved_target_user_id) THEN
    RETURN jsonb_build_object('status', 'member_not_found', 'membership', NULL);
  END IF;

  IF p_action = 'upsert' THEN
    INSERT INTO tet_kb.organization_memberships (organization_id, user_id, role)
    VALUES (p_organization_id, resolved_target_user_id, p_role)
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET role = EXCLUDED.role
    RETURNING * INTO changed_membership;
  ELSE
    UPDATE tet_kb.organization_memberships membership
    SET role = p_role
    WHERE membership.organization_id = p_organization_id
      AND membership.user_id = resolved_target_user_id
    RETURNING * INTO changed_membership;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'membership', to_jsonb(changed_membership)
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.mutate_organization_membership(
  text, uuid, uuid, text, text, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.mutate_organization_membership(
  text, uuid, uuid, text, text, uuid
) TO service_role;
