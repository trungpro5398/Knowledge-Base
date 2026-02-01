-- Seed: Convert page_templates to published pages so KB shows content
-- Requires: tet-prosys space exists, at least one user in auth.users
-- Template name -> page title, slug = lowercase letters+numbers+hyphens

INSERT INTO pages (space_id, parent_id, slug, path, title, status, created_by, updated_by)
SELECT
  s.id,
  NULL,
  lower(regexp_replace(regexp_replace(pt.name, '\s+', '-', 'g'), '[^a-zA-Z0-9\-]', '', 'g')),
  lower(regexp_replace(regexp_replace(pt.name, '\s+', '-', 'g'), '[^a-zA-Z0-9\-]', '', 'g'))::ltree,
  pt.name,
  'draft',
  u.id,
  u.id
FROM page_templates pt
JOIN spaces s ON s.id = pt.space_id AND s.slug = 'tet-prosys'
CROSS JOIN LATERAL (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) u
ON CONFLICT (space_id, path) DO NOTHING;

-- Create version + publish for each new page
DO $$
DECLARE
  r RECORD;
  vid UUID;
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN RETURN; END IF;

  FOR r IN
    SELECT p.id, pt.content_md
    FROM pages p
    JOIN page_templates pt ON pt.space_id = p.space_id AND pt.name = p.title
    JOIN spaces s ON s.id = p.space_id AND s.slug = 'tet-prosys'
    WHERE p.current_version_id IS NULL
    AND p.status = 'draft'
  LOOP
    INSERT INTO page_versions (page_id, content_md, summary, created_by)
    VALUES (r.id, r.content_md, 'Seeded from template', uid)
    RETURNING id INTO vid;
    UPDATE pages SET current_version_id = vid, status = 'published', updated_by = uid
    WHERE id = r.id;
  END LOOP;
END $$;

-- Add first user as admin of tet-prosys so they can edit in Admin UI
INSERT INTO memberships (user_id, space_id, role)
SELECT u.id, s.id, 'admin'
FROM (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) u
CROSS JOIN (SELECT id FROM spaces WHERE slug = 'tet-prosys' LIMIT 1) s
WHERE u.id IS NOT NULL AND s.id IS NOT NULL
ON CONFLICT (user_id, space_id) DO NOTHING;
