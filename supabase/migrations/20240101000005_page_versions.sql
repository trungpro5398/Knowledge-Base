-- Page versions: content history
CREATE TABLE page_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  content_md TEXT,
  content_json JSONB,
  summary TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_page_versions_page ON page_versions(page_id);

-- Add FK from pages to current_version after page_versions exists
ALTER TABLE pages
  ADD CONSTRAINT fk_pages_current_version
  FOREIGN KEY (current_version_id) REFERENCES page_versions(id) ON DELETE SET NULL;
