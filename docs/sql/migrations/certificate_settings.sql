-- ============================================================
-- CERTIFICATE SETTINGS + USER CERTIFICATE NAME
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add certificate_name to user_profiles (separate from full_name)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS certificate_name TEXT;

-- 2. Global certificate design settings (single row)
CREATE TABLE IF NOT EXISTS certificate_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name          TEXT NOT NULL DEFAULT 'Daleel Learning Platform',
  cert_title        TEXT NOT NULL DEFAULT 'Certificate of Achievement',
  signer_name       TEXT NOT NULL DEFAULT 'Daleel Team',
  signer_title      TEXT NOT NULL DEFAULT 'Platform Director',
  footer_tagline    TEXT NOT NULL DEFAULT 'Empowering ERP careers across the Middle East',
  primary_color     TEXT NOT NULL DEFAULT '#0d9488',
  accent_color      TEXT NOT NULL DEFAULT '#d97706',
  linkedin_org_id   TEXT,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Seed the single settings row
INSERT INTO certificate_settings (org_name)
VALUES ('Daleel Learning Platform')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE certificate_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cert_settings_public_read" ON certificate_settings
  FOR SELECT USING (true);

CREATE POLICY "cert_settings_service_write" ON certificate_settings
  FOR ALL USING (auth.role() = 'service_role');
