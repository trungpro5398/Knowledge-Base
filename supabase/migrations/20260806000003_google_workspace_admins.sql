-- Google Workspace SSO admin allowlist for TET CRM.
-- These users are granted organization and space admin access when they first sign in.

CREATE OR REPLACE FUNCTION public.is_tet_crm_admin_email(p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(trim(coalesce(p_email, ''))) IN (
    'lap.le@tet-edu.com',
    'trung.nguyen@tet-edu.com',
    'admin@tet-edu.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.grant_tet_crm_admin_access_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, public
AS $$
DECLARE
  tet_org_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  IF NOT public.is_tet_crm_admin_email(NEW.email) THEN
    RETURN NEW;
  END IF;

  INSERT INTO organization_memberships (user_id, organization_id, role)
  VALUES (NEW.id, tet_org_id, 'admin')
  ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = CASE
      WHEN organization_memberships.role = 'owner' THEN 'owner'
      ELSE 'admin'
    END;

  INSERT INTO memberships (user_id, space_id, role)
  SELECT NEW.id, s.id, 'admin'
  FROM spaces s
  WHERE s.organization_id = tet_org_id
  ON CONFLICT (user_id, space_id) DO UPDATE SET role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_tet_crm_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_tet_crm_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_tet_crm_admin_access_to_user();

CREATE OR REPLACE FUNCTION public.grant_tet_crm_admin_access_to_space()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, public
AS $$
DECLARE
  tet_org_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  IF NEW.organization_id = tet_org_id THEN
    INSERT INTO memberships (user_id, space_id, role)
    SELECT u.id, NEW.id, 'admin'
    FROM auth.users u
    WHERE public.is_tet_crm_admin_email(u.email)
    ON CONFLICT (user_id, space_id) DO UPDATE SET role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tet_space_created_grant_admins ON spaces;
CREATE TRIGGER on_tet_space_created_grant_admins
  AFTER INSERT OR UPDATE OF organization_id ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_tet_crm_admin_access_to_space();

-- Backfill the allowlisted accounts if they already exist in Supabase Auth.
INSERT INTO organization_memberships (user_id, organization_id, role)
SELECT u.id, '00000000-0000-0000-0000-000000000001'::uuid, 'admin'
FROM auth.users u
WHERE public.is_tet_crm_admin_email(u.email)
ON CONFLICT (user_id, organization_id) DO UPDATE
  SET role = CASE
    WHEN organization_memberships.role = 'owner' THEN 'owner'
    ELSE 'admin'
  END;

INSERT INTO memberships (user_id, space_id, role)
SELECT u.id, s.id, 'admin'
FROM auth.users u
CROSS JOIN spaces s
WHERE public.is_tet_crm_admin_email(u.email)
  AND s.organization_id = '00000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (user_id, space_id) DO UPDATE SET role = 'admin';

REVOKE ALL ON FUNCTION public.is_tet_crm_admin_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_tet_crm_admin_access_to_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_tet_crm_admin_access_to_space() FROM PUBLIC;
