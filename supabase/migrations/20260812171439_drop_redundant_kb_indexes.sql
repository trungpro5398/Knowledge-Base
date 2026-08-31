-- Remove indexes whose leading columns are already covered by another KB
-- btree index. This reduces write amplification, vacuum work, and storage
-- without removing any supported lookup path.
DROP INDEX IF EXISTS tet_kb.idx_spaces_slug;
DROP INDEX IF EXISTS tet_kb.idx_organizations_slug;
DROP INDEX IF EXISTS tet_kb.idx_page_versions_page;
DROP INDEX IF EXISTS tet_kb.idx_pages_parent;
DROP INDEX IF EXISTS tet_kb.idx_page_label_mappings_page;
