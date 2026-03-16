-- Fix Row Level Security (RLS) policies for users table
-- Run this in Supabase SQL Editor

-- Disable RLS temporarily to fix policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "allow_all_users" ON users;
DROP POLICY IF EXISTS "Users can manage own data" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;

-- Create permissive policy that allows all operations
CREATE POLICY "allow_all_users" ON users 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Verify the policy is created
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';
