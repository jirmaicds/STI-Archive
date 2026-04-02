-- Fix RLS policies to avoid infinite recursion
-- Run this in Supabase SQL Editor to fix existing databases

-- Drop problematic policies
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can update all users" ON users;
DROP POLICY IF EXISTS "Admin can delete users" ON users;
DROP POLICY IF EXISTS "Admin can view all logs" ON activity_logs;
DROP POLICY IF EXISTS "Admin can insert logs" ON activity_logs;
DROP POLICY IF EXISTS "Admin can manage articles" ON articles;

-- Create new non-recursive policies
CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage logs" ON activity_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage articles" ON articles
  FOR ALL USING (auth.role() = 'service_role');