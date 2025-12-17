# Admin Login Troubleshooting

## 401 Error: Invalid username or password

If you're getting a 401 error when trying to login, check the following:

### 1. Check if user exists in database

Run this SQL in Supabase:

```sql
SELECT id, username, is_active, created_at 
FROM admin_credentials 
WHERE username = '@fmolv';
```

If no rows are returned, the user doesn't exist. Run the setup script:
- `docs/sql/setup_admin_user_complete.sql`

### 2. Check password hash

The password hash should match. Verify it:

```sql
SELECT password_hash 
FROM admin_credentials 
WHERE username = '@fmolv';
```

The hash should start with `$2b$10$`. If it doesn't, regenerate it using:
```bash
node scripts/add-admin-user.js
```

### 3. Check RLS Policy

The `admin_credentials` table has RLS enabled. You have two options:

**Option A: Use Service Role Client (Recommended)**
- Set `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` file
- Get it from: Supabase Dashboard > Settings > API > Service Role Key
- The login API will use this to bypass RLS

**Option B: Fix RLS Policy**
Run this SQL to allow API access:
```sql
-- File: docs/sql/fix_admin_credentials_rls_simple.sql
```

### 4. Check Environment Variables

Make sure you have these in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Required for admin login
```

### 5. Check Console Logs

The API now logs errors. Check your server console for:
- "Admin login fetch error:" - Database access issue
- "Admin user not found:" - User doesn't exist
- "Server configuration error" - Missing service role key

### 6. Verify Password

Make sure you're using the exact password:
- Username: `@fmolv`
- Password: `Mario123456@Mm`

### 7. Check Account Status

Verify the account is active:
```sql
SELECT username, is_active, locked_until, failed_login_attempts
FROM admin_credentials 
WHERE username = '@fmolv';
```

If `is_active = false` or `locked_until` is in the future, the account is locked.

## Quick Fix

1. **Set Service Role Key** in `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

2. **Restart your dev server**:
   ```bash
   npm run dev
   ```

3. **Try logging in again**

If it still doesn't work, check the server console for the specific error message.


