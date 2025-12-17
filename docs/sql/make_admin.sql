-- =====================================================
-- MAKE YOURSELF AN ADMIN
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: First, make sure the admin tables exist (run admin_schema.sql first if not)

-- Step 2: Find your user ID
-- Go to Supabase Dashboard > Authentication > Users
-- Copy your user ID (UUID)

-- Step 3: Replace 'YOUR_USER_ID_HERE' with your actual user ID and run:

-- Option A: If admin_roles table already has data
INSERT INTO admin_users (user_id, role_id, is_active)
SELECT 
    'YOUR_USER_ID_HERE'::uuid,  -- Replace with your user ID
    id,
    true
FROM admin_roles 
WHERE name = 'super_admin'
ON CONFLICT (user_id) DO UPDATE SET is_active = true;

-- Option B: If you need to create the role first
-- First insert the role (skip if already exists)
INSERT INTO admin_roles (name, description, permissions) 
VALUES (
    'super_admin', 
    'Full access to all features', 
    '["manage_paths", "manage_users", "manage_resources", "view_analytics", "scrape_resources", "manage_admins"]'
)
ON CONFLICT (name) DO NOTHING;

-- Then add yourself as admin
INSERT INTO admin_users (user_id, role_id, is_active)
SELECT 
    'YOUR_USER_ID_HERE'::uuid,  -- Replace with your user ID
    id,
    true
FROM admin_roles 
WHERE name = 'super_admin'
ON CONFLICT (user_id) DO UPDATE SET is_active = true;

-- Step 4: Verify you're an admin
SELECT 
    au.*, 
    ar.name as role_name, 
    ar.permissions
FROM admin_users au
JOIN admin_roles ar ON au.role_id = ar.id
WHERE au.user_id = 'YOUR_USER_ID_HERE'::uuid;  -- Replace with your user ID

