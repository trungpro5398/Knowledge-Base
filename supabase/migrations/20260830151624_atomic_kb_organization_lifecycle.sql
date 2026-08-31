-- Preserve the last-owner invariant for active organizations while allowing
-- membership cleanup after an organization has been soft-deleted.
CREATE OR REPLACE FUNCTION tet_kb.prevent_last_organization_owner_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, pg_catalog
AS $$
DECLARE
  organization_is_active boolean;
BEGIN
  SELECT organization.deleted_at IS NULL
  INTO organization_is_active
  FROM tet_kb.organizations organization
  WHERE organization.id = OLD.organization_id
  FOR UPDATE;

  IF OLD.role <> 'owner' OR (TG_OP = 'UPDATE' AND NEW.role = 'owner') THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  -- Hard-delete cascades have no organization row; soft-delete cleanup has an
  -- inactive row. Neither should be blocked by the active-owner invariant.
  IF COALESCE(organization_is_active, false) AND NOT EXISTS (
    SELECT 1
    FROM tet_kb.organization_memberships membership
    WHERE membership.organization_id = OLD.organization_id
      AND membership.role = 'owner'
      AND membership.user_id <> OLD.user_id
  ) THEN
    RAISE EXCEPTION 'An organization must retain at least one owner';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.prevent_last_organization_owner_removal()
  FROM PUBLIC, anon, authenticated;

-- Create the organization, owner membership and optional initial space in one
-- transaction. A colliding preferred space slug falls back to a UUID-derived
-- slug without leaving a partially-created organization.
CREATE OR REPLACE FUNCTION tet_kb.create_organization(
  p_name text,
  p_slug text,
  p_icon text,
  p_description text,
  p_actor_user_id uuid,
  p_with_initial_space boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  created_organization tet_kb.organizations%ROWTYPE;
  created_space tet_kb.spaces%ROWTYPE;
  organization_result jsonb;
BEGIN
  BEGIN
    INSERT INTO tet_kb.organizations (name, slug, icon, description)
    VALUES (p_name, p_slug, p_icon, p_description)
    RETURNING * INTO created_organization;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'status', 'slug_conflict',
        'organization', NULL,
        'space', NULL
      );
  END;

  INSERT INTO tet_kb.organization_memberships (
    user_id,
    organization_id,
    role
  )
  VALUES (p_actor_user_id, created_organization.id, 'owner');

  IF p_with_initial_space THEN
    BEGIN
      INSERT INTO tet_kb.spaces (
        name,
        slug,
        icon,
        description,
        organization_id
      )
      VALUES (
        created_organization.name,
        created_organization.slug,
        created_organization.icon,
        created_organization.description,
        created_organization.id
      )
      RETURNING * INTO created_space;
    EXCEPTION
      WHEN unique_violation THEN
        INSERT INTO tet_kb.spaces (
          name,
          slug,
          icon,
          description,
          organization_id
        )
        VALUES (
          created_organization.name,
          left(created_organization.slug, 43) || '-' || created_organization.id::text,
          created_organization.icon,
          created_organization.description,
          created_organization.id
        )
        RETURNING * INTO created_space;
    END;

    INSERT INTO tet_kb.memberships (user_id, space_id, role)
    VALUES (p_actor_user_id, created_space.id, 'admin');

    organization_result := jsonb_build_object(
      'id', created_organization.id,
      'name', created_organization.name,
      'slug', created_organization.slug,
      'icon', created_organization.icon,
      'description', created_organization.description
    );
  ELSE
    organization_result := to_jsonb(created_organization);
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'organization', organization_result,
    'space', CASE
      WHEN p_with_initial_space THEN to_jsonb(created_space)
      ELSE NULL
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.create_organization(
  text, text, text, text, uuid, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.create_organization(
  text, text, text, text, uuid, boolean
) TO service_role;

-- Authorize and perform the soft-delete lifecycle while holding the
-- organization row lock used by organization membership mutations.
CREATE OR REPLACE FUNCTION tet_kb.delete_organization(
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
  deleted_organization tet_kb.organizations%ROWTYPE;
BEGIN
  SELECT membership.role
  INTO actor_role
  FROM tet_kb.organizations organization
  LEFT JOIN tet_kb.organization_memberships membership
    ON membership.organization_id = organization.id
   AND membership.user_id = p_actor_user_id
  WHERE organization.id = p_organization_id
    AND organization.deleted_at IS NULL
  FOR UPDATE OF organization;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'organization_not_found',
      'organization', NULL
    );
  END IF;
  IF actor_role IS DISTINCT FROM 'owner' THEN
    RETURN jsonb_build_object('status', 'forbidden', 'organization', NULL);
  END IF;

  UPDATE tet_kb.organizations organization
  SET deleted_at = NOW(),
      updated_at = NOW()
  WHERE organization.id = p_organization_id
  RETURNING * INTO deleted_organization;

  UPDATE tet_kb.spaces space
  SET organization_id = NULL
  WHERE space.organization_id = p_organization_id;

  DELETE FROM tet_kb.organization_memberships membership
  WHERE membership.organization_id = p_organization_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'organization', to_jsonb(deleted_organization)
  );
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.delete_organization(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.delete_organization(uuid, uuid)
  TO service_role;
