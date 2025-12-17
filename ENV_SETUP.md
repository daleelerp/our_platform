# Environment Variables Setup Guide

## ⚠️ Current Issue

Your Supabase project `jzdkwjryjiwfldzicicu.supabase.co` cannot be found. This means:
- The project was deleted, OR
- The project was paused, OR  
- The project ID is incorrect

## 🔧 Quick Fix Steps

### Step 1: Check Your Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Check if your project exists:
   - If it's **paused**: Click "Restore" to reactivate it
   - If it's **deleted**: You'll need to create a new project
   - If it doesn't exist: Create a new project

### Step 2: Get Your Project Credentials

Once you have an active project:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (under "Project API keys")
   - **service_role key** (under "Project API keys" - keep this secret!)

### Step 3: Create `.env.local` File

Create a file named `.env.local` in your project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important**: Replace the placeholder values with your actual credentials from Step 2.

### Step 4: Restart Your Dev Server

After creating `.env.local`:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## 🆕 If You Need to Create a New Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: Your project name
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
4. Wait for project to be created (~2 minutes)
5. Follow Step 2 above to get credentials

## ✅ Verify It's Working

After setting up `.env.local` and restarting:

1. The DNS errors should stop
2. Your app should load without 500 errors
3. Check the browser console - no more "ENOTFOUND" errors

## 📝 Notes

- `.env.local` is already in `.gitignore` - it won't be committed
- Never commit your `.env.local` file to git
- The app will work with empty data if Supabase is unavailable, but features won't function

