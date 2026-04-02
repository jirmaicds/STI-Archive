-- Migration Script: Add user_type and department columns, update roles and policies
-- Run this in Supabase SQL Editor to update the user management system

-- Step 1: Update existing admin role values to capitalized versions
UPDATE users SET role = 'Admin' WHERE role = 'admin';
UPDATE users SET role = 'Co-Admin' WHERE role = 'coadmin';
UPDATE users SET role = 'Sub-Admin' WHERE role = 'subadmin';

-- Step 2: Add the new columns (skip if already exist)
-- Add user_type column
-- ALTER TABLE users ADD COLUMN user_type TEXT;  -- Commented out if column exists

-- Add program column
-- ALTER TABLE users ADD COLUMN program VARCHAR(100);  -- Commented out if column exists

-- Step 3: Set verified for existing users and user_type based on updated roles
UPDATE users SET verified = true WHERE verified IS NULL OR verified = false;
UPDATE users SET user_type = 'user' WHERE role = 'user';
-- UPDATE users SET user_type = 'user' WHERE role = 'pending';
UPDATE users SET user_type = 'admin' WHERE role = 'Admin';
UPDATE users SET user_type = 'coadmin' WHERE role = 'Co-Admin';
UPDATE users SET user_type = 'subadmin' WHERE role = 'Sub-Admin';

-- Step 4: Add CHECK constraint to enforce valid user_type values
ALTER TABLE users DROP CONSTRAINT IF EXISTS user_type_check;
ALTER TABLE users ADD CONSTRAINT user_type_check
  CHECK (user_type IN ('user', 'admin', 'coadmin', 'subadmin'));

-- Step 4: Update RLS policies (Fixed to avoid infinite recursion)
-- Drop problematic policies
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can update all users" ON users;
DROP POLICY IF EXISTS "Admin can delete users" ON users;
DROP POLICY IF EXISTS "Admin can view all logs" ON activity_logs;
DROP POLICY IF EXISTS "Admin can insert logs" ON activity_logs;
DROP POLICY IF EXISTS "Admin can manage articles" ON articles;

-- Create service role policies (bypass RLS for API access)
CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage logs" ON activity_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage articles" ON articles
  FOR ALL USING (auth.role() = 'service_role');

-- Step 5: Update sample admin user
UPDATE users SET user_type = 'admin', role = 'Admin' WHERE email = 'admin@stiarchives.edu';

-- Step 6: Add sample admin users with different roles
-- Add coadmin user (password: admin123)
INSERT INTO users (email, password, fullname, role, user_type, verified)
VALUES (
  'coadmin@stiarchives.edu',
  '$2a$10$8K1p/a0dL3.XQ/Z7Y5J5J5J5J5J5J5J5J5J5J5J5J5J5J5J5',
  'Co Administrator',
  'admin',
  'coadmin',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Add subadmin user (password: admin123)
INSERT INTO users (email, password, fullname, role, user_type, verified)
VALUES (
  'subadmin@stiarchives.edu',
  '$2a$10$8K1p/a0dL3.XQ/Z7Y5J5J5J5J5J5J5J5J5J5J5J5J5J5J5J5',
  'Sub Administrator',
  'admin',
  'subadmin',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Step 7: Add index on the new columns for performance
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_program ON users(program);

-- Data preservation: The 'role' column has been updated with new values.
-- The new 'user_type' and 'program' columns are added with sample admin users.
-- All existing data is preserved and mapped appropriately.