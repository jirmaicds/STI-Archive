-- Fix RLS for ALL tables (skip users - already fixed)
-- Run this in Supabase SQL Editor

-- Fix carousel table
ALTER TABLE carousel DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_carousel" ON carousel;
CREATE POLICY "allow_all_carousel" ON carousel FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE carousel ENABLE ROW LEVEL SECURITY;

-- Fix articles table
ALTER TABLE articles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_articles" ON articles;
CREATE POLICY "allow_all_articles" ON articles FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Fix user_uploads table
ALTER TABLE user_uploads DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_uploads" ON user_uploads;
CREATE POLICY "allow_all_uploads" ON user_uploads FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE user_uploads ENABLE ROW LEVEL SECURITY;

-- Fix activity_logs table
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_activity" ON activity_logs;
CREATE POLICY "allow_all_activity" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Fix site_settings table
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_settings" ON site_settings;
CREATE POLICY "allow_all_settings" ON site_settings FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Fix documents table
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_documents" ON documents;
CREATE POLICY "allow_all_documents" ON documents FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Fix files table
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_files" ON files;
CREATE POLICY "allow_all_files" ON files FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Fix user_preferences table
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_preferences" ON user_preferences;
CREATE POLICY "allow_all_preferences" ON user_preferences FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

SELECT 'All RLS policies fixed!' as message;
