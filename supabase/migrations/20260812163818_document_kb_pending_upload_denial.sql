-- The table is service-role only. Keep an explicit deny policy so the RLS
-- posture remains obvious to operators and database advisors even if table
-- privileges are changed accidentally later.
DROP POLICY IF EXISTS pending_attachment_uploads_no_direct_access
  ON tet_kb.pending_attachment_uploads;
CREATE POLICY pending_attachment_uploads_no_direct_access
  ON tet_kb.pending_attachment_uploads
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
