-- Tighten attachment access. The previous policies allowed every authenticated
-- user to list, download, upload, and delete every object in this private bucket.
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
        (
          NOT p_requires_editor
          AND (m.user_id IS NOT NULL OR om.user_id IS NOT NULL)
        )
        OR (
          p_requires_editor
          AND (
            m.role IN ('editor', 'admin')
            OR om.role IN ('admin', 'owner')
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION tet_kb.can_access_attachment_object(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION tet_kb.can_access_attachment_object(text, boolean)
  TO authenticated, service_role;

DROP POLICY IF EXISTS attachments_storage_select ON storage.objects;
DROP POLICY IF EXISTS attachments_storage_insert ON storage.objects;
DROP POLICY IF EXISTS attachments_storage_delete ON storage.objects;

CREATE POLICY attachments_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'attachments'
    AND tet_kb.can_access_attachment_object(name, false)
  );

CREATE POLICY attachments_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attachments'
    AND tet_kb.can_access_attachment_object(name, true)
  );

CREATE POLICY attachments_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'attachments'
    AND tet_kb.can_access_attachment_object(name, true)
  );

-- Keep the bucket allowlist aligned with the API's accepted MIME types.
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'attachments';

-- Use a SECURITY DEFINER helper so organization-membership policies do not
-- recursively query the RLS-protected table they are protecting.
CREATE OR REPLACE FUNCTION tet_kb.current_organization_role(p_organization_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog
AS $$
  SELECT role
  FROM tet_kb.organization_memberships
  WHERE organization_id = p_organization_id
    AND user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION tet_kb.current_organization_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION tet_kb.current_organization_role(uuid)
  TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can view org memberships" ON tet_kb.organization_memberships;
DROP POLICY IF EXISTS "Org admins can manage memberships" ON tet_kb.organization_memberships;

CREATE POLICY "Users can view org memberships"
  ON tet_kb.organization_memberships
  FOR SELECT TO authenticated
  USING (tet_kb.current_organization_role(organization_id) IS NOT NULL);

CREATE POLICY "Org admins can add non-owner memberships"
  ON tet_kb.organization_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    tet_kb.current_organization_role(organization_id) IN ('admin', 'owner')
    AND (
      role <> 'owner'
      OR tet_kb.current_organization_role(organization_id) = 'owner'
    )
  );

CREATE POLICY "Org admins can update non-owner memberships"
  ON tet_kb.organization_memberships
  FOR UPDATE TO authenticated
  USING (
    tet_kb.current_organization_role(organization_id) = 'owner'
    OR (
      tet_kb.current_organization_role(organization_id) = 'admin'
      AND role <> 'owner'
    )
  )
  WITH CHECK (
    tet_kb.current_organization_role(organization_id) = 'owner'
    OR (
      tet_kb.current_organization_role(organization_id) = 'admin'
      AND role <> 'owner'
    )
  );

CREATE POLICY "Org admins can delete non-owner memberships"
  ON tet_kb.organization_memberships
  FOR DELETE TO authenticated
  USING (
    tet_kb.current_organization_role(organization_id) = 'owner'
    OR (
      tet_kb.current_organization_role(organization_id) = 'admin'
      AND role <> 'owner'
    )
  );

-- Protect the last owner even if a caller bypasses the Fastify API and uses
-- Supabase directly. Locking the organization serializes concurrent changes.
CREATE OR REPLACE FUNCTION tet_kb.prevent_last_organization_owner_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, pg_catalog
AS $$
BEGIN
  IF OLD.role <> 'owner' OR (TG_OP = 'UPDATE' AND NEW.role = 'owner') THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM tet_kb.organizations
  WHERE id = OLD.organization_id
  FOR UPDATE;

  -- An organization being deleted cascades its memberships and should not be
  -- blocked by this invariant.
  IF FOUND AND NOT EXISTS (
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

DROP TRIGGER IF EXISTS prevent_last_organization_owner_removal
  ON tet_kb.organization_memberships;
CREATE TRIGGER prevent_last_organization_owner_removal
  BEFORE UPDATE OF role OR DELETE ON tet_kb.organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION tet_kb.prevent_last_organization_owner_removal();

REVOKE ALL ON FUNCTION tet_kb.prevent_last_organization_owner_removal() FROM PUBLIC;
