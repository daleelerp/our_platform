-- =============================================================================
-- Fix: user_profiles.certificate_name is referenced by app code (the cert
-- page, the certificate-name PATCH route, and the exam GET route) but was
-- never actually migrated onto this database -- those queries have been
-- silently failing and falling back to "Student" on every certificate.
-- =============================================================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS certificate_name TEXT;
