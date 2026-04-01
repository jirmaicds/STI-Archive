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

-- Step 3: Set user_type based on updated roles
UPDATE users SET user_type = 'user' WHERE role = 'user';
UPDATE users SET user_type = 'user' WHERE role = 'pending';
UPDATE users SET user_type = 'admin' WHERE role = 'Admin';
UPDATE users SET user_type = 'coadmin' WHERE role = 'Co-Admin';
UPDATE users SET user_type = 'subadmin' WHERE role = 'Sub-Admin';

-- Step 4: Add CHECK constraint to enforce valid user_type values
ALTER TABLE users DROP CONSTRAINT IF EXISTS user_type_check;
ALTER TABLE users ADD CONSTRAINT user_type_check
  CHECK (user_type IN ('user', 'admin', 'coadmin', 'subadmin'));

-- Step 4: Update RLS policies to use user_type instead of role
-- Drop old policies
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can update all users" ON users;
DROP POLICY IF EXISTS "Admin can delete users" ON users;
DROP POLICY IF EXISTS "Admin can view all logs" ON activity_logs;
DROP POLICY IF EXISTS "Admin can insert logs" ON activity_logs;
DROP POLICY IF EXISTS "Admin can manage articles" ON articles;

-- Recreate policies with user_type checks
CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (
    (SELECT user_type FROM users WHERE id = auth.uid()) IN ('admin', 'coadmin', 'subadmin')
  );

CREATE POLICY "Admin can update all users" ON users
  FOR UPDATE USING (
    (SELECT user_type FROM users WHERE id = auth.uid()) IN ('admin', 'coadmin', 'subadmin')
  );

CREATE POLICY "Admin can delete users" ON users
  FOR DELETE USING (
    (SELECT user_type FROM users WHERE id = auth.uid()) IN ('admin', 'coadmin', 'subadmin')
  );

CREATE POLICY "Admin can view all logs" ON activity_logs
  FOR SELECT USING (
    (SELECT user_type FROM users WHERE id = auth.uid()) IN ('admin', 'coadmin', 'subadmin')
  );

CREATE POLICY "Admin can insert logs" ON activity_logs
  FOR INSERT WITH CHECK (
    (SELECT user_type FROM users WHERE id = auth.uid()) IN ('admin', 'coadmin', 'subadmin')
  );

CREATE POLICY "Admin can manage articles" ON articles
  FOR ALL USING (
    (SELECT user_type FROM users WHERE id = auth.uid()) IN ('admin', 'coadmin')
  );

-- Step 5: Update sample admin user
UPDATE users SET user_type = 'admin', role = 'Admin' WHERE email = 'admin@stiarchives.edu';

-- Step 6: Add index on the new columns for performance
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_program ON users(program);

-- Data preservation: The 'role' column has been updated with new values.
-- The new 'user_type' and 'program' columns are added.
-- All existing data is preserved and mapped appropriately.