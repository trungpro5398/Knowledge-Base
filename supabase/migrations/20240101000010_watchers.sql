-- Watchers: users who want notifications on page changes
CREATE TABLE watchers (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, page_id)
);

CREATE INDEX idx_watchers_page ON watchers(page_id);
