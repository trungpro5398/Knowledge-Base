-- Chạy script này trong Supabase Dashboard > SQL Editor
-- Điều kiện: Có ít nhất 1 user đã đăng ký (auth.users)
-- Mục đích: Đổ page_templates → pages + page_versions (published)

-- Bước 1: Kiểm tra điều kiện
DO $$
BEGIN
  IF (SELECT count(*) FROM auth.users) = 0 THEN
    RAISE EXCEPTION 'Cần có ít nhất 1 user. Đăng ký/đăng nhập trước rồi chạy lại.';
  END IF;
  IF (SELECT count(*) FROM spaces WHERE slug = 'tet-prosys') = 0 THEN
    RAISE EXCEPTION 'Space tet-prosys chưa tồn tại. Chạy migration seed_prosys_templates trước.';
  END IF;
END $$;

-- Bước 2: Tạo pages từ page_templates
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

-- Bước 3: Tạo version + publish
DO $$
DECLARE
  r RECORD;
  vid UUID;
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users ORDER BY created_at LIMIT 1;

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

-- Bước 4: Gán membership admin
INSERT INTO memberships (user_id, space_id, role)
SELECT u.id, s.id, 'admin'
FROM (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) u
CROSS JOIN (SELECT id FROM spaces WHERE slug = 'tet-prosys' LIMIT 1) s
WHERE u.id IS NOT NULL AND s.id IS NOT NULL
ON CONFLICT (user_id, space_id) DO NOTHING;

-- Bước 5: Cập nhật sort_order (thứ tự đúng)
UPDATE pages SET sort_order = ord.ord
FROM (VALUES
  ('Overview', 1),
  ('ProSys Core Design & Operating Model', 2),
  ('Workflow & Status', 3),
  ('Services to Procure', 4),
  ('Quotes', 5),
  ('PM Approve Quote', 6),
  ('FM Approve Quote', 7),
  ('Services Being Delivered', 8),
  ('Invoice', 9),
  ('FM Approve To Pay', 10),
  ('Done', 11),
  ('Task Rules', 12),
  ('Labels & Batch System', 13),
  ('Roles & Responsibilities', 14),
  ('Finance & Audit', 15),
  ('Board Usage Guide', 16),
  ('Automation Rules', 17)
) AS ord(title, ord)
WHERE pages.title = ord.title
AND pages.space_id = (SELECT id FROM spaces WHERE slug = 'tet-prosys' LIMIT 1);

-- Xong
SELECT 'Đã seed ' || count(*) || ' pages.' as result FROM pages WHERE space_id = (SELECT id FROM spaces WHERE slug = 'tet-prosys' LIMIT 1);
