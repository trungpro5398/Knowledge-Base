-- API mutations lock the organization before reading actor privileges. Take
-- the same lock for direct authenticated UPDATE/DELETE operations so an
-- actor cannot be demoted concurrently after the API has authorized them.

CREATE OR REPLACE FUNCTION tet_kb.prevent_last_organization_owner_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, pg_catalog
AS $$
DECLARE
  organization_exists boolean;
BEGIN
  SELECT true
  INTO organization_exists
  FROM tet_kb.organizations
  WHERE id = OLD.organization_id
  FOR UPDATE;

  IF OLD.role <> 'owner' OR (TG_OP = 'UPDATE' AND NEW.role = 'owner') THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  -- An organization being deleted cascades its memberships and should not be
  -- blocked by this invariant.
  IF organization_exists AND NOT EXISTS (
    SELECT 1
    FROM tet_kb.organization_memberships
    WHERE organization_id = OLD.organization_id
      AND role = 'owner'
      AND user_id <> OLD.user_id
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
