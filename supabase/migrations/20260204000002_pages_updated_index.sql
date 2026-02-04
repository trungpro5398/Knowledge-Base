-- Support search ordering by last update
CREATE INDEX IF NOT EXISTS idx_pages_space_updated_at
  ON pages (space_id, updated_at DESC);
