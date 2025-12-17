/**
 * Script to add admin user with encrypted password
 * Usage: node scripts/add-admin-user.js
 * 
 * This script generates a bcrypt hash and provides SQL to insert the admin user
 */

const bcrypt = require('bcryptjs');

const username = '@fmolv';
const password = 'Mario123456@Mm';

// Generate bcrypt hash
const saltRounds = 10;
const passwordHash = bcrypt.hashSync(password, saltRounds);

console.log('='.repeat(60));
console.log('ADMIN USER CREDENTIALS');
console.log('='.repeat(60));
console.log(`Username: ${username}`);
console.log(`Password: ${password}`);
console.log(`\nGenerated Bcrypt Hash:`);
console.log(passwordHash);
console.log('\n' + '='.repeat(60));
console.log('SQL INSERT STATEMENT:');
console.log('='.repeat(60));
console.log(`
-- Run this SQL in Supabase SQL Editor:

-- First, make sure the table exists (run admin_credentials_schema.sql if needed)

INSERT INTO public.admin_credentials (username, password_hash, is_active, created_at)
VALUES (
  '${username}',
  '${passwordHash}',
  true,
  now()
)
ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  failed_login_attempts = 0,
  locked_until = null,
  updated_at = now();

-- Verify the user was created:
SELECT id, username, is_active, created_at 
FROM public.admin_credentials 
WHERE username = '${username}';
`);

console.log('\n✅ Hash generated successfully!');
console.log('📋 Copy the SQL above and run it in Supabase SQL Editor\n');

