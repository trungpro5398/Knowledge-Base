-- Search: tsvector for full-text search on published content
-- Add search_vector to a searchable view or materialized table
-- We'll use a column on page_versions and update via trigger on publish

ALTER TABLE page_versions ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

CREATE OR REPLACE FUNCTION page_versions_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.content_md, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER page_versions_search_vector_trigger
  BEFORE INSERT OR UPDATE ON page_versions
  FOR EACH ROW EXECUTE FUNCTION page_versions_search_vector_update();

-- Index for fast search
CREATE INDEX idx_page_versions_search ON page_versions USING GIN (search_vector);
