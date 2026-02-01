-- Thứ tự sắp xếp anh em (siblings) trong cây trang
-- sort_order càng nhỏ = càng lên trước
ALTER TABLE pages ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_pages_parent_sort ON pages(parent_id, sort_order);

-- Cập nhật sort_order cho ProSys pages (thứ tự từ seed templates)
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
