# Quick Setup: Secure Admin System

## 🚀 What Was Done

1. ✅ **Session Duration**: Changed from 24 hours to **1 hour**
2. ✅ **Secure Session Storage**: Sessions now stored in database (`admin_sessions` table)
3. ✅ **Database Validation**: Every request validates session against database
4. ✅ **Full Data Access**: Admin pages use service role client to access all data
5. ✅ **CRUD API**: Created `/api/admin/data` for secure CRUD operations

## 📝 What You Need to Do

### Step 1: Create Admin Sessions Table

Run this SQL in Supabase SQL Editor:

```sql
-- Copy and paste the contents of: docs/sql/admin_sessions_schema.sql
```

Or run it directly:

```sql
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_token character varying NOT NULL UNIQUE,
  admin_id uuid NOT NULL REFERENCES public.admin_credentials(id) ON DELETE CASCADE,
  username character varying NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_accessed_at timestamp with time zone DEFAULT now(),
  ip_address character varying,
  user_agent text,
  CONSTRAINT admin_sessions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS admin_sessions_token_idx ON public.admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS admin_sessions_admin_id_idx ON public.admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON public.admin_sessions(expires_at);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage admin sessions"
  ON public.admin_sessions
  FOR ALL
  USING (auth.role() = 'service_role');
```

### Step 2: Verify Environment Variable

Make sure `.env.local` has:

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get it from: Supabase Dashboard → Settings → API → Service Role Key

### Step 3: Restart Dev Server

```bash
# Stop server (Ctrl+C) and restart
npm run dev
```

## ✅ Test It

1. Go to `http://localhost:3000/admin/login`
2. Login with:
   - Username: `@fmolv`
   - Password: `Mario123456@Mm`
3. You should be redirected to `/admin` dashboard
4. Session will expire after 1 hour

## 🔒 Security Features

- ✅ Sessions validated against database on every request
- ✅ 1-hour expiration
- ✅ Automatic cleanup on logout
- ✅ Service role access for full data operations
- ✅ Secure httpOnly cookies

## 📚 Full Documentation

See `docs/ADMIN_SECURITY_SETUP.md` for complete details.


