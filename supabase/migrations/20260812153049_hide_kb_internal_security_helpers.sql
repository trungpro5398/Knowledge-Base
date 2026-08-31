-- Keep policy helpers callable by PostgreSQL without publishing them as
-- PostgREST RPC endpoints from the exposed tet_kb schema.
CREATE SCHEMA IF NOT EXISTS tet_kb_private;

REVOKE ALL ON SCHEMA tet_kb_private FROM PUBLIC;
GRANT USAGE ON SCHEMA tet_kb_private TO authenticated, service_role;

ALTER FUNCTION tet_kb.get_user_space_role(uuid, uuid)
  SET SCHEMA tet_kb_private;
ALTER FUNCTION tet_kb.user_can_edit_space(uuid, uuid)
  SET SCHEMA tet_kb_private;
ALTER FUNCTION tet_kb.user_is_space_admin(uuid, uuid)
  SET SCHEMA tet_kb_private;
ALTER FUNCTION tet_kb.current_organization_role(uuid)
  SET SCHEMA tet_kb_private;
ALTER FUNCTION tet_kb.can_access_attachment_object(text, boolean)
  SET SCHEMA tet_kb_private;
ALTER FUNCTION tet_kb.can_upload_attachment_object(text)
  SET SCHEMA tet_kb_private;

-- The moved upload helper previously called its sibling by the old qualified
-- name. Replace only its body while preserving the function identity used by
-- the Storage policy.
CREATE OR REPLACE FUNCTION tet_kb_private.can_upload_attachment_object(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog
AS $$
  SELECT tet_kb_private.can_access_attachment_object(p_object_name, true)
     AND EXISTS (
       SELECT 1
       FROM tet_kb.pending_attachment_uploads pending
       WHERE pending.object_path = p_object_name
         AND pending.user_id = auth.uid()
         AND pending.expires_at > now()
     );
$$;

REVOKE ALL ON FUNCTION tet_kb_private.get_user_space_role(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION tet_kb_private.user_can_edit_space(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION tet_kb_private.user_is_space_admin(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION tet_kb_private.current_organization_role(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION tet_kb_private.can_access_attachment_object(text, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION tet_kb_private.can_upload_attachment_object(text)
  FROM PUBLIC, anon, authenticated;

-- Authenticated users invoke these helpers only through RLS policies. The
-- private schema is not exposed by the Supabase Data API.
GRANT EXECUTE ON FUNCTION tet_kb_private.get_user_space_role(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION tet_kb_private.user_can_edit_space(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION tet_kb_private.user_is_space_admin(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION tet_kb_private.current_organization_role(uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION tet_kb_private.can_access_attachment_object(text, boolean)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION tet_kb_private.can_upload_attachment_object(text)
  TO authenticated, service_role;

-- Cover the auth.users foreign key for user deletion and cleanup operations.
CREATE INDEX IF NOT EXISTS idx_pending_attachment_uploads_user_id
  ON tet_kb.pending_attachment_uploads (user_id);
