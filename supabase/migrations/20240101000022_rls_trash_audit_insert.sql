-- Bổ sung RLS: trash INSERT/DELETE, audit_events INSERT
-- (API dùng pool có thể bypass RLS, nhưng cần policy nếu dùng Supabase client)
-- Helper functions (idempotent - cần nếu chạy migration này độc lập)

CREATE OR REPLACE FUNCTION user_can_edit_space(p_user_id UUID, p_space_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = p_user_id AND space_id = p_space_id
    AND role IN ('editor', 'admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- trash: editor/admin có thể soft-delete và restore
CREATE POLICY trash_insert ON trash FOR INSERT
  WITH CHECK (
    deleted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM pages p WHERE p.id = page_id
      AND user_can_edit_space(auth.uid(), p.space_id)
    )
  );

CREATE POLICY trash_delete ON trash FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pages p WHERE p.id = trash.page_id
      AND user_can_edit_space(auth.uid(), p.space_id)
    )
  );

-- audit_events: editor/admin có thể ghi (API ghi qua pool)
CREATE POLICY audit_events_insert ON audit_events FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND user_can_edit_space(auth.uid(), space_id)
  );
