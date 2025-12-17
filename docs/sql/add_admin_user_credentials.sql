-- =====================================================
-- ADD ADMIN USER WITH ENCRYPTED PASSWORD
-- Username: @fmolv
-- Password: Mario123456@Mm
-- =====================================================

-- Note: In production, passwords should be hashed using bcrypt or similar
-- This script uses PostgreSQL's crypt function (requires pgcrypto extension)
-- For Supabase, we'll use a Node.js bcrypt hash instead

-- Step 1: Enable pgcrypto extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Insert admin user with encrypted password
-- The password hash below is generated using bcrypt with 10 rounds
-- Password: Mario123456@Mm
-- You can generate a new hash using: bcrypt.hashSync('Mario123456@Mm', 10)

INSERT INTO public.admin_credentials (username, password_hash, is_active, created_at)
VALUES (
  '@fmolv',
  '$2b$10$rK8X9YzP5wQ3mN4vB7cD8eF2gH6jK9L0M1N2O3P4Q5R6S7T8U9V0W', -- This is a placeholder, we'll generate the real hash
  true,
  now()
)
ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  updated_at = now();

-- IMPORTANT: The password hash above is a placeholder.
-- You need to generate the actual bcrypt hash for 'Mario123456@Mm'
-- 
-- To generate the hash, you can:
-- 1. Use Node.js: 
--    const bcrypt = require('bcrypt');
--    const hash = bcrypt.hashSync('Mario123456@Mm', 10);
--    console.log(hash);
--
-- 2. Or use an online bcrypt generator (for development only)
--    https://bcrypt-generator.com/
--
-- 3. Or run this in a Node.js script:
--    node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('Mario123456@Mm', 10));"

-- Step 3: Verify the user was created
SELECT id, username, is_active, created_at 
FROM public.admin_credentials 
WHERE username = '@fmolv';

