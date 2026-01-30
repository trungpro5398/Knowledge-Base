-- Labels/tags for pages within a space
CREATE TABLE page_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, name)
);

CREATE TABLE page_label_mappings (
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES page_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (page_id, label_id)
);

CREATE INDEX idx_page_labels_space ON page_labels(space_id);
CREATE INDEX idx_page_label_mappings_page ON page_label_mappings(page_id);
CREATE INDEX idx_page_label_mappings_label ON page_label_mappings(label_id);
