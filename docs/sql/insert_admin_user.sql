-- =====================================================
-- INSERT ADMIN USER
-- Run this after creating the admin_credentials table
-- =====================================================

-- First, run the create-admin-user.js script to get the hashed password:
-- node scripts/create-admin-user.js

-- Then use the hashed password in this INSERT statement:

INSERT INTO public.admin_credentials (username, password_hash, is_active)
VALUES (
  '@fmolv',
  '$2a$10$YOUR_HASHED_PASSWORD_HERE',  -- Replace with hash from script
  true
)
ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  failed_login_attempts = 0,
  locked_until = NULL;

-- Verify the admin user was created:
SELECT id, username, is_active, created_at, last_login_at
FROM public.admin_credentials
WHERE username = '@fmolv';

