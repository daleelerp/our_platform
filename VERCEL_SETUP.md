# Vercel Environment Variables Setup

## ⚠️ Current Issues

1. **Supabase URL doesn't exist**: `jzdkwjryjiwfldzicicu.supabase.co` cannot be found (DNS error)
2. **Wrong environment variable name**: You're using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (which is now supported)

## ✅ Quick Fix Steps

### Step 1: Verify Your Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Check if your project exists:
   - If it's **paused**: Click "Restore" to reactivate
   - If it's **deleted**: Create a new project
   - If it doesn't exist: The URL `jzdkwjryjiwfldzicicu.supabase.co` is invalid

### Step 2: Get Correct Credentials

Once you have an active Supabase project:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (should look like `https://xxxxx.supabase.co`)
   - **anon/public key** (under "Project API keys" - this is your publishable key)
   - **service_role key** (under "Project API keys" - keep this secret!)

### Step 3: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add/Update these variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important**: 
- Replace `your-actual-project-id` with your real Supabase project ID
- Use the **anon/public key** from Supabase for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- The code now supports both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### Step 4: Redeploy

After setting environment variables:
1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger auto-deploy

## 🔍 Verify It's Working

After redeploying:
1. Check the deployment logs for errors
2. Visit your site - the client-side error should be gone
3. Check browser console - no more Supabase connection errors

## 📝 Notes

- The code now supports both variable names for flexibility
- If your Supabase project was deleted, you'll need to create a new one
- Make sure the project URL matches exactly what's in Supabase dashboard

