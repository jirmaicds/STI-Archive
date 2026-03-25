-- Create user_uploads table with correct schema
-- Run this in Supabase SQL Editor

-- First, drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS user_uploads;

-- Create user_uploads table
CREATE TABLE user_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  category TEXT,
  topic TEXT,
  type TEXT,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  rejected_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_uploads ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read
CREATE POLICY "Users can read all uploads" ON user_uploads
  FOR SELECT USING (true);

-- Create policy for authenticated users to insert their own
CREATE POLICY "Users can insert own uploads" ON user_uploads
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR auth.jwt()->>'role' IN ('admin', 'coadmin'));

-- Create policy for admins to update
CREATE POLICY "Admins can update uploads" ON user_uploads
  FOR UPDATE USING (auth.jwt()->>'role' IN ('admin', 'coadmin'));

-- Create policy for admins to delete
CREATE POLICY "Admins can delete uploads" ON user_uploads
  FOR DELETE USING (auth.jwt()->>'role' IN ('admin', 'coadmin'));

-- Insert test uploads with file_path
INSERT INTO user_uploads (id, user_id, title, description, file_path, file_type, status, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Test Article', 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry''s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.', 'https://eopbqatvianrjkdbypvk.supabase.co/storage/v1/object/public/Studies/Research/2023-2024/Cejes%20et%20al.pdf', 'pdf', 'approved', NOW());

-- Add RLS policy for anon access (for testing)
DROP POLICY IF EXISTS "Anon can read uploads" ON user_uploads;
CREATE POLICY "Anon can read uploads" ON user_uploads FOR SELECT USING (true);
