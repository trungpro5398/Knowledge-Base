-- The application uses the service-role API. Browser clients only need Auth
-- and the tightly scoped Storage policies, never direct Knowledge Base table
-- access. Removing broad PostgREST DML closes several authorization and
-- attribution bypasses in the legacy RLS policies.
REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA tet_kb
  FROM anon, authenticated;

-- Remove the legacy KB-space provisioning hook. Shared Auth and public/CRM
-- objects are intentionally untouched because this migration is KB-scoped.
DROP TRIGGER IF EXISTS on_tet_space_created_grant_admins ON tet_kb.spaces;
