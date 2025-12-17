# Admin Security Setup Guide

## ✅ Complete Secure Admin System

The admin system now has:
- ✅ 1-hour session duration
- ✅ Database-backed session validation
- ✅ Service role client for full data access
- ✅ Secure CRUD API routes
- ✅ Session cleanup on logout

## 📋 Setup Steps

### 1. Create Admin Sessions Table

Run this SQL in Supabase SQL Editor:

```sql
-- File: docs/sql/admin_sessions_schema.sql
```

This creates the `admin_sessions` table for secure session management.

### 2. Environment Variables

Make sure you have these in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Required!
```

**Important**: The `SUPABASE_SERVICE_ROLE_KEY` is required for admin operations. Get it from:
- Supabase Dashboard → Settings → API → Service Role Key

### 3. Login Credentials

- **URL**: `http://localhost:3000/admin/login`
- **Username**: `@fmolv`
- **Password**: `Mario123456@Mm`

## 🔒 Security Features

### Session Management
- Sessions stored in database (`admin_sessions` table)
- 1-hour expiration
- Automatic validation on every request
- Session cleanup on logout
- Last accessed time tracking

### Data Access
- Service role client bypasses RLS
- Full CRUD access to all tables
- Secure API routes with session validation
- All operations logged

### Authentication
- Bcrypt password hashing (10 rounds)
- Account lockout after 5 failed attempts
- Session tokens stored in httpOnly cookies
- Secure cookie flags in production

## 📁 Files Created/Modified

### New Files
- `src/utils/admin-supabase.ts` - Secure admin Supabase client
- `src/app/api/admin/data/route.ts` - CRUD API for all tables
- `docs/sql/admin_sessions_schema.sql` - Session table schema

### Modified Files
- `src/app/api/admin/login/route.ts` - 1-hour sessions, database storage
- `src/utils/admin-auth.ts` - Database session validation
- `src/app/admin/page.tsx` - Uses secure admin client
- `src/app/admin/scraper/page.tsx` - Uses secure admin client

## 🔄 How It Works

### Login Flow
1. User submits username/password
2. API verifies credentials against `admin_credentials` table
3. Creates session record in `admin_sessions` table
4. Sets secure cookies (1 hour expiration)
5. Redirects to admin dashboard

### Session Validation
1. Every admin request checks `admin_session` cookie
2. Validates session token against `admin_sessions` table
3. Checks expiration time
4. Updates `last_accessed_at`
5. Returns admin data if valid

### Data Access
1. Admin pages use `getAdminSupabaseClient()`
2. This uses service role key to bypass RLS
3. Full access to all tables and data
4. All operations are logged

## 🛠️ API Usage

### CRUD Operations

**GET** - Fetch data:
```
GET /api/admin/data?table=learning_paths&limit=10&offset=0
GET /api/admin/data?table=user_profiles&id=uuid-here
```

**POST** - Create record:
```
POST /api/admin/data?table=learning_paths
Body: { "title": "...", "description": "..." }
```

**PUT** - Update record:
```
PUT /api/admin/data?table=learning_paths&id=uuid-here
Body: { "title": "Updated title" }
```

**DELETE** - Delete record:
```
DELETE /api/admin/data?table=learning_paths&id=uuid-here
```

All endpoints require valid admin session cookie.

## 🧹 Maintenance

### Cleanup Expired Sessions

Run this SQL periodically (or set up a cron job):

```sql
SELECT cleanup_expired_admin_sessions();
```

Or manually:
```sql
DELETE FROM admin_sessions WHERE expires_at < NOW();
```

## ⚠️ Security Notes

1. **Never expose service role key** - Keep it in `.env.local` only
2. **Use HTTPS in production** - Secure cookies require HTTPS
3. **Monitor sessions** - Check `admin_sessions` table regularly
4. **Rotate passwords** - Change admin passwords periodically
5. **Limit access** - Only give admin credentials to trusted users

## 🐛 Troubleshooting

### "Unauthorized" errors
- Check if session cookie exists
- Verify session hasn't expired (1 hour)
- Check `admin_sessions` table for your session

### "Server configuration error"
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Restart dev server after adding env var

### Can't access data
- Ensure `admin_sessions` table exists
- Check RLS policies (should use service role)
- Verify service role key is correct


