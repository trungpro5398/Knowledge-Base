-- RLS for organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can view organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Only org owners can update organization settings
CREATE POLICY "Org owners can update organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- RLS for organization_memberships table
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- Users can view memberships in their organizations
CREATE POLICY "Users can view org memberships"
  ON organization_memberships FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Org admins can manage memberships
CREATE POLICY "Org admins can manage memberships"
  ON organization_memberships FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Update spaces RLS to consider organization membership
DROP POLICY IF EXISTS "Users can view spaces they belong to" ON spaces;

CREATE POLICY "Users can view spaces"
  ON spaces FOR SELECT
  USING (
    -- Direct space membership
    id IN (
      SELECT space_id FROM memberships WHERE user_id = auth.uid()
    )
    OR
    -- Organization membership (if space belongs to org)
    (organization_id IS NOT NULL AND organization_id IN (
      SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid()
    ))
  );
