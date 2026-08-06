-- Keep Knowledge Base tables separate from the existing Tech5 public schema.
-- auth.users remains shared with the rest of the Supabase project.

CREATE SCHEMA IF NOT EXISTS tet_kb;

ALTER TABLE public.spaces SET SCHEMA tet_kb;
ALTER TABLE public.memberships SET SCHEMA tet_kb;
ALTER TABLE public.pages SET SCHEMA tet_kb;
ALTER TABLE public.page_versions SET SCHEMA tet_kb;
ALTER TABLE public.attachments SET SCHEMA tet_kb;
ALTER TABLE public.page_labels SET SCHEMA tet_kb;
ALTER TABLE public.page_label_mappings SET SCHEMA tet_kb;
ALTER TABLE public.page_templates SET SCHEMA tet_kb;
ALTER TABLE public.comments SET SCHEMA tet_kb;
ALTER TABLE public.watchers SET SCHEMA tet_kb;
ALTER TABLE public.trash SET SCHEMA tet_kb;
ALTER TABLE public.audit_events SET SCHEMA tet_kb;
ALTER TABLE public.organizations SET SCHEMA tet_kb;
ALTER TABLE public.organization_memberships SET SCHEMA tet_kb;

-- Move only Knowledge Base helper functions. Auth hook functions stay public
-- because Supabase Auth calls them by their public function name.
ALTER FUNCTION public.get_user_space_role(uuid, uuid) SET SCHEMA tet_kb;
ALTER FUNCTION public.user_can_edit_space(uuid, uuid) SET SCHEMA tet_kb;
ALTER FUNCTION public.user_is_space_admin(uuid, uuid) SET SCHEMA tet_kb;
ALTER FUNCTION public.page_versions_search_vector_update() SET SCHEMA tet_kb;
ALTER FUNCTION tet_kb.get_user_space_role(uuid, uuid)
  SET search_path = tet_kb, public;
ALTER FUNCTION tet_kb.user_can_edit_space(uuid, uuid)
  SET search_path = tet_kb, public;
ALTER FUNCTION tet_kb.user_is_space_admin(uuid, uuid)
  SET search_path = tet_kb, public;

-- Trigger functions remain public, but resolve Knowledge Base tables first.
ALTER FUNCTION public.grant_tet_crm_admin_access_to_user()
  SET search_path = tet_kb, public;
ALTER FUNCTION public.grant_tet_crm_admin_access_to_space()
  SET search_path = tet_kb, public;

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

CREATE OR REPLACE FUNCTION public.hook_restrict_signup_tet_edu(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  user_email := lower(trim(event->'user'->>'email'));
  IF user_email IS NULL OR user_email = '' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Email is required',
        'http_code', 400
      )
    );
  END IF;

  IF lower(split_part(user_email, '@', 2)) != 'tet-edu.com' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Chỉ cho phép đăng ký bằng email @tet-edu.com',
        'http_code', 403
      )
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hook_restrict_signup_tet_edu TO supabase_auth_admin;

GRANT USAGE ON SCHEMA tet_kb TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA tet_kb TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA tet_kb TO authenticated, service_role;
