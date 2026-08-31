-- Viewers may only read an attachment when it is referenced by the currently
-- published version. Editors retain draft access for the authoring workflow.
CREATE OR REPLACE FUNCTION tet_kb.can_access_attachment_object(
  p_object_name text,
  p_requires_editor boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tet_kb.pages p
    JOIN tet_kb.spaces s ON s.id = p.space_id
    LEFT JOIN tet_kb.page_versions pv ON pv.id = p.published_version_id
    LEFT JOIN tet_kb.memberships m
      ON m.space_id = p.space_id
      AND m.user_id = auth.uid()
    LEFT JOIN tet_kb.organization_memberships om
      ON om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
    LEFT JOIN tet_kb.trash t ON t.page_id = p.id
    WHERE p.id::text = split_part(p_object_name, '/', 1)
      AND split_part(p_object_name, '/', 2) <> ''
      AND p_object_name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}-[A-Za-z0-9.-]{1,100}$'
      AND t.page_id IS NULL
      AND (
        m.role IN ('editor', 'admin')
        OR om.role IN ('admin', 'owner')
        OR (
          NOT p_requires_editor
          AND p.status = 'published'
          AND pv.id IS NOT NULL
          AND (m.user_id IS NOT NULL OR om.user_id IS NOT NULL)
          AND position(p_object_name in COALESCE(pv.content_md, '')) > 0
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION tet_kb.can_access_attachment_object(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION tet_kb.can_access_attachment_object(text, boolean)
  TO authenticated, service_role;
