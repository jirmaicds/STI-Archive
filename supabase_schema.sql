-- Supabase SQL for moderated upload workflow
-- Run this in your Supabase SQL editor

-- Drop existing tables if needed (uncomment if you want to recreate)
-- DROP TABLE IF EXISTS pending_uploads;
-- DROP TABLE IF EXISTS approved_uploads;

-- Create pending_uploads table
CREATE TABLE IF NOT EXISTS pending_uploads (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending'
);

-- Create approved_uploads table
CREATE TABLE IF NOT EXISTS approved_uploads (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE,
    approved_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by TEXT NOT NULL
);

-- Create storage bucket 'uploads' (if not exists)
-- Note: Create the 'uploads' bucket in Supabase Storage dashboard
-- Set public access if files should be viewable without auth

-- Enable Row Level Security (RLS) for security
ALTER TABLE pending_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth setup)
-- Allow authenticated users to insert into pending_uploads
CREATE POLICY "Users can insert pending uploads" ON pending_uploads
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Allow admins/coadmins to view pending uploads
CREATE POLICY "Admins can view pending uploads" ON pending_uploads
    FOR SELECT USING (auth.role() = 'admin' OR auth.role() = 'coadmin');

-- Allow admins/coadmins to update/delete pending uploads
CREATE POLICY "Admins can manage pending uploads" ON pending_uploads
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'coadmin');

-- Allow public to view approved uploads (if public access)
CREATE POLICY "Public can view approved uploads" ON approved_uploads
    FOR SELECT USING (true);

-- Allow admins/coadmins to manage approved uploads
CREATE POLICY "Admins can manage approved uploads" ON approved_uploads
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'coadmin');