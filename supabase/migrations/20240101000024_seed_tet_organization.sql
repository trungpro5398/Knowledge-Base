-- Seed TET Education Group organization
INSERT INTO organizations (id, name, slug, icon, description, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'TET Education Group',
  'tet-education',
  '🏫',
  'Tổ chức giáo dục TET - quản lý tất cả tài liệu nội bộ',
  '{
    "theme": "blue",
    "features": {
      "comments": true,
      "versions": true,
      "templates": true
    }
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Update existing tet-prosys space to belong to TET Education Group
UPDATE spaces 
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE slug = 'tet-prosys';

-- Add all existing space members to TET Education Group as members
INSERT INTO organization_memberships (user_id, organization_id, role)
SELECT DISTINCT 
  m.user_id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  CASE 
    WHEN m.role = 'admin' THEN 'admin'
    ELSE 'member'
  END
FROM memberships m
JOIN spaces s ON m.space_id = s.id
WHERE s.organization_id = '00000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (user_id, organization_id) DO NOTHING;
