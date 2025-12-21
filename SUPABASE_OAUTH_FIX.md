# Fix OAuth Redirect to Localhost Issue

## Problem
Login buttons redirect to `http://localhost:3000` instead of `https://www.daleel.site`

## Root Cause
The issue is in **Supabase OAuth configuration**, not the code. The code correctly uses `window.location.origin`, but Supabase needs the production URL whitelisted.

## Solution: Update Supabase OAuth Settings

### Step 1: Go to Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**

### Step 2: Update Site URL
1. Find **Site URL** field
2. Change from `http://localhost:3000` to:
   ```
   https://www.daleel.site
   ```

### Step 3: Update Redirect URLs
1. Find **Redirect URLs** section
2. Add these URLs (one per line):
   ```
   https://www.daleel.site/auth/callback
   https://www.daleel.site/auth/callback?redirect=/pricing
   https://www.daleel.site/auth/callback?redirect=/dashboard
   http://localhost:3000/auth/callback
   ```
   
   **Note**: Keep localhost for local development, but add production URLs.

### Step 4: Update Google OAuth Settings (if using Google)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID
4. Click **Edit**
5. Under **Authorized redirect URIs**, add:
   ```
   https://www.daleel.site/auth/callback
   ```
6. Remove or keep `http://localhost:3000/auth/callback` for local dev
7. Click **Save**

### Step 5: Verify Environment Variables
Make sure these are set in **Vercel**:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-key
NEXT_PUBLIC_BASE_URL=https://www.daleel.site
```

### Step 6: Redeploy
After updating Supabase settings:
1. The changes take effect immediately (no redeploy needed for Supabase)
2. But you may want to redeploy Vercel to ensure environment variables are correct

## Code Changes Made
✅ Updated `src/app/auth/callback/route.ts` to handle redirect parameter
✅ Updated `src/app/api/subscription/checkout/route.ts` to use production URL

## Testing
1. Visit `https://www.daleel.site`
2. Click login button
3. Should redirect to Google OAuth
4. After login, should redirect back to `https://www.daleel.site/dashboard` (not localhost)

## Important Notes
- The code uses `window.location.origin` which automatically uses the current domain
- The issue is purely in Supabase/Google OAuth configuration
- Make sure both Supabase AND Google OAuth have the production URL whitelisted





