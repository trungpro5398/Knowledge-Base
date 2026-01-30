-- Enable RLS on all tables
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_label_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trash ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Helper: get user's role in a space (null if no membership)
CREATE OR REPLACE FUNCTION get_user_space_role(p_user_id UUID, p_space_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM memberships WHERE user_id = p_user_id AND space_id = p_space_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: user has at least editor role
CREATE OR REPLACE FUNCTION user_can_edit_space(p_user_id UUID, p_space_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = p_user_id AND space_id = p_space_id
    AND role IN ('editor', 'admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: user has admin role
CREATE OR REPLACE FUNCTION user_is_space_admin(p_user_id UUID, p_space_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = p_user_id AND space_id = p_space_id
    AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- spaces: users can see spaces they belong to
CREATE POLICY spaces_select ON spaces FOR SELECT
  USING (EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND space_id = spaces.id));

CREATE POLICY spaces_insert ON spaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY spaces_update ON spaces FOR UPDATE
  USING (user_is_space_admin(auth.uid(), id));

-- memberships: users see own memberships; admins manage
CREATE POLICY memberships_select ON memberships FOR SELECT
  USING (user_id = auth.uid() OR user_is_space_admin(auth.uid(), space_id));

CREATE POLICY memberships_insert ON memberships FOR INSERT
  WITH CHECK (user_is_space_admin(auth.uid(), space_id));

CREATE POLICY memberships_update ON memberships FOR UPDATE
  USING (user_is_space_admin(auth.uid(), space_id));

CREATE POLICY memberships_delete ON memberships FOR DELETE
  USING (user_is_space_admin(auth.uid(), space_id));

-- pages: SELECT if published OR can edit; mutate if can edit
CREATE POLICY pages_select ON pages FOR SELECT
  USING (
    status = 'published'
    OR user_can_edit_space(auth.uid(), space_id)
  );

CREATE POLICY pages_insert ON pages FOR INSERT
  WITH CHECK (user_can_edit_space(auth.uid(), space_id));

CREATE POLICY pages_update ON pages FOR UPDATE
  USING (user_can_edit_space(auth.uid(), space_id));

CREATE POLICY pages_delete ON pages FOR DELETE
  USING (user_can_edit_space(auth.uid(), space_id));

-- page_versions: through page
CREATE POLICY page_versions_select ON page_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_versions.page_id
      AND (p.status = 'published' OR user_can_edit_space(auth.uid(), p.space_id))
    )
  );

CREATE POLICY page_versions_insert ON page_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_versions.page_id
      AND user_can_edit_space(auth.uid(), p.space_id)
    )
  );

-- attachments
CREATE POLICY attachments_select ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = attachments.page_id
      AND (p.status = 'published' OR user_can_edit_space(auth.uid(), p.space_id))
    )
  );

CREATE POLICY attachments_insert ON attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = attachments.page_id
      AND user_can_edit_space(auth.uid(), p.space_id)
    )
  );

CREATE POLICY attachments_delete ON attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = attachments.page_id
      AND user_can_edit_space(auth.uid(), p.space_id)
    )
  );

-- page_labels
CREATE POLICY page_labels_select ON page_labels FOR SELECT
  USING (user_can_edit_space(auth.uid(), space_id));

CREATE POLICY page_labels_all ON page_labels FOR ALL
  USING (user_can_edit_space(auth.uid(), space_id))
  WITH CHECK (user_can_edit_space(auth.uid(), space_id));

-- page_label_mappings
CREATE POLICY page_label_mappings_select ON page_label_mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages p WHERE p.id = page_label_mappings.page_id
      AND user_can_edit_space(auth.uid(), p.space_id)
    )
  );

CREATE POLICY page_label_mappings_all ON page_label_mappings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pages p WHERE p.id = page_label_mappings.page_id
      AND user_can_edit_space(auth.uid(), p.space_id)
    )
  );

-- page_templates
CREATE POLICY page_templates_select ON page_templates FOR SELECT
  USING (user_can_edit_space(auth.uid(), space_id));

CREATE POLICY page_templates_all ON page_templates FOR ALL
  USING (user_can_edit_space(auth.uid(), space_id));

-- comments
CREATE POLICY comments_select ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages p WHERE p.id = comments.page_id
      AND (p.status = 'published' OR user_can_edit_space(auth.uid(), p.space_id))
    )
  );

CREATE POLICY comments_insert ON comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM pages p WHERE p.id = comments.page_id
      AND (p.status = 'published' OR user_can_edit_space(auth.uid(), p.space_id))
    )
  );

CREATE POLICY comments_update ON comments FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY comments_delete ON comments FOR DELETE
  USING (author_id = auth.uid());

-- watchers
CREATE POLICY watchers_select ON watchers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY watchers_insert ON watchers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY watchers_delete ON watchers FOR DELETE
  USING (user_id = auth.uid());

-- trash: users see trash for pages in their spaces
CREATE POLICY trash_select ON trash FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages p WHERE p.id = trash.page_id
      AND user_can_edit_space(auth.uid(), p.space_id)
    )
  );

-- audit_events: admin only read
CREATE POLICY audit_events_select ON audit_events FOR SELECT
  USING (user_is_space_admin(auth.uid(), space_id));
