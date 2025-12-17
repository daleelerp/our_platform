-- =====================================================
-- ADD ADMIN USER
-- Run this to make yourself an admin
-- =====================================================

-- Step 1: First, check if admin_roles table has a default role
-- If not, create one
INSERT INTO public.admin_roles (name, description, permissions)
VALUES 
  ('super_admin', 'Super Administrator', '["*"]'::jsonb),
  ('admin', 'Administrator', '["manage_paths", "manage_resources", "scrape_resources", "manage_users", "view_analytics"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Get your user ID from auth.users
-- Replace 'YOUR_EMAIL@example.com' with your actual email
-- Or use the query below to find your user ID

-- Find your user ID:
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL@example.com';

-- Step 3: Add yourself as admin
-- Replace 'YOUR_USER_ID' with the UUID from step 2
-- Replace 'super_admin' with the role you want (super_admin or admin)

INSERT INTO public.admin_users (user_id, role_id, is_active, created_at)
SELECT 
  u.id as user_id,
  r.id as role_id,
  true as is_active,
  now() as created_at
FROM auth.users u
CROSS JOIN public.admin_roles r
WHERE u.email = 'YOUR_EMAIL@example.com'  -- Replace with your email
  AND r.name = 'super_admin'  -- or 'admin'
ON CONFLICT (user_id) 
DO UPDATE SET 
  is_active = true,
  role_id = EXCLUDED.role_id;

-- Step 4: Verify you're now an admin
SELECT 
  au.id,
  au.user_id,
  au.is_active,
  ar.name as role_name,
  ar.permissions,
  u.email
FROM public.admin_users au
JOIN public.admin_roles ar ON au.role_id = ar.id
JOIN auth.users u ON au.user_id = u.id
WHERE u.email = 'YOUR_EMAIL@example.com';  -- Replace with your email

