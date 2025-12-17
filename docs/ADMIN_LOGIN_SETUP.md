# Admin Login Setup Guide

## ✅ Setup Complete!

The admin login system is now configured with username/password authentication.

## 📋 Quick Setup Steps

### 1. Run the Database Setup SQL

In your Supabase SQL Editor, run:

```sql
-- File: docs/sql/setup_admin_user_complete.sql
```

This will:
- Create the `admin_credentials` table
- Add the admin user with encrypted password
- Set up proper security policies

### 2. Login Credentials

- **URL**: `http://localhost:3000/admin/login`
- **Username**: `@fmolv`
- **Password**: `Mario123456@Mm`

### 3. Access Admin Panel

After logging in, you'll be redirected to:
- `http://localhost:3000/admin` - Admin Dashboard

## 🔒 Security Features

- ✅ Passwords are encrypted using bcrypt (10 rounds)
- ✅ Account lockout after 5 failed login attempts (30 minutes)
- ✅ Session-based authentication with secure cookies
- ✅ Row Level Security (RLS) enabled on admin_credentials table
- ✅ Only service role can access admin credentials

## 📁 Files Created/Modified

### Database
- `docs/sql/admin_credentials_schema.sql` - Table schema
- `docs/sql/setup_admin_user_complete.sql` - Complete setup script
- `docs/sql/add_admin_user_credentials.sql` - User insertion script

### Code
- `src/app/admin/login/page.tsx` - Login page (already existed)
- `src/app/api/admin/login/route.ts` - Login API route (already existed)
- `src/app/api/admin/logout/route.ts` - Logout API route (already existed)
- `src/utils/admin-auth.ts` - Admin session utilities (already existed)
- `src/app/admin/layout.tsx` - Admin layout with auth check (already existed)

### Scripts
- `scripts/add-admin-user.js` - Script to generate password hash

## 🔄 How It Works

1. User visits `/admin` → Redirected to `/admin/login` if not authenticated
2. User enters username and password
3. API route (`/api/admin/login`) verifies credentials:
   - Fetches user from `admin_credentials` table
   - Compares password using bcrypt
   - Creates secure session cookie
4. User is redirected to `/admin` dashboard
5. Layout checks for admin session on every request
6. If no session, redirects back to login

## 🛠️ Adding More Admin Users

To add more admin users, you can:

1. **Generate password hash**:
   ```bash
   node scripts/add-admin-user.js
   ```
   (Modify the username/password in the script first)

2. **Or use Node.js directly**:
   ```javascript
   const bcrypt = require('bcryptjs');
   const hash = bcrypt.hashSync('YourPassword', 10);
   console.log(hash);
   ```

3. **Insert into database**:
   ```sql
   INSERT INTO public.admin_credentials (username, password_hash, is_active)
   VALUES ('username', 'generated_hash', true);
   ```

## 🚨 Troubleshooting

### Can't access `/admin`
- Make sure you've run the SQL setup script
- Check that the `admin_credentials` table exists
- Verify your username/password are correct

### Login fails
- Check browser console for errors
- Verify the password hash in database matches
- Check that `is_active = true` for your user

### Session expires immediately
- Check cookie settings in browser
- Verify `NODE_ENV` is set correctly
- Check that cookies are being set (browser DevTools → Application → Cookies)

## 📝 Notes

- Admin authentication is **separate** from regular user authentication
- You don't need to be logged in as a regular user to access admin
- Admin sessions last 24 hours
- Failed login attempts are tracked and accounts can be locked

