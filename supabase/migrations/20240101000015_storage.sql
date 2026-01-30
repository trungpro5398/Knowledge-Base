-- Storage bucket for attachments
-- Creates bucket via storage schema (Supabase)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage.objects - auth required, API enforces page-level access
CREATE POLICY attachments_storage_select ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY attachments_storage_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY attachments_storage_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);
