-- Precompiled HTML and TOC for public read (avoids runtime markdown rendering)
ALTER TABLE page_versions ADD COLUMN IF NOT EXISTS rendered_html TEXT;
ALTER TABLE page_versions ADD COLUMN IF NOT EXISTS toc_json JSONB;
