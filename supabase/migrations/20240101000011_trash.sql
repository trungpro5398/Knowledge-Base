-- Trash: soft-deleted pages for restore
CREATE TABLE trash (
  page_id UUID PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
