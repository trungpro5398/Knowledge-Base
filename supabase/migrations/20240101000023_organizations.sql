-- Organizations: top-level tenant (e.g., TET Education Group)
-- Each organization can have multiple spaces

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_deleted ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Organization memberships: who belongs to which org
CREATE TABLE organization_memberships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('member', 'admin', 'owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX idx_org_memberships_user ON organization_memberships(user_id);
CREATE INDEX idx_org_memberships_org ON organization_memberships(organization_id);

-- Add organization_id to spaces (existing spaces will be NULL initially)
ALTER TABLE spaces ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX idx_spaces_organization ON spaces(organization_id);

-- Update memberships table to be organization-scoped
-- Users inherit space access from organization membership
-- But can also have space-specific roles that override org role

COMMENT ON TABLE organizations IS 'Top-level tenants (e.g., TET Education Group)';
COMMENT ON TABLE organization_memberships IS 'User membership in organizations';
COMMENT ON COLUMN spaces.organization_id IS 'Parent organization (NULL for standalone spaces)';
