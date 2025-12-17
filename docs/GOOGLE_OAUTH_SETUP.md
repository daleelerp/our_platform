# Google OAuth Setup Guide

## Step 1: Configure Google OAuth in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list and click to enable it
4. You'll need to create a Google OAuth app (see Step 2)

## Step 2: Create Google OAuth Credentials (Free)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google+ API** (or **Google Identity Services API**)
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - (Find your project ref in Supabase → Settings → API)
7. Copy the **Client ID** and **Client Secret**

## Step 3: Add Credentials to Supabase

1. Back in Supabase → **Authentication** → **Providers** → **Google**
2. Paste your **Client ID** and **Client Secret**
3. Click **Save**

## Step 4: Test the Flow

1. Visit your app at `http://localhost:3000`
2. Click **"Continue with Google"**
3. After Google login, you'll be redirected to `/app`
4. The user profile will be created automatically in `user_profiles` table

## Notes

- Google OAuth is **completely free** (no charges)
- The redirect URI must match exactly what Supabase expects
- For local development, you may need to add `http://localhost:3000/auth/callback` to Google OAuth settings too

