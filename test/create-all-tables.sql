-- Complete Database Schema for STI Archives
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  fullname VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'pending',
  verified BOOLEAN DEFAULT FALSE,
  activation_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_code VARCHAR(10),
  reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id),
  admin_name VARCHAR(255),
  admin_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  target_user_name VARCHAR(255),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Articles Table
CREATE TABLE IF NOT EXISTS articles (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  authors TEXT,
  meta TEXT,
  summary TEXT,
  category VARCHAR(100),
  strand VARCHAR(100),
  level VARCHAR(100),
  program VARCHAR(100),
  year VARCHAR(10),
  type VARCHAR(100),
  pdf_path VARCHAR(500),
  topic VARCHAR(100),
  qualitativeQuantitative VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Uploads Table
CREATE TABLE IF NOT EXISTS user_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size BIGINT,
  topic VARCHAR(100),
  type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- Carousel Table
CREATE TABLE IF NOT EXISTS carousel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carousel_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255),
  description TEXT,
  image_url VARCHAR(500),
  link_url VARCHAR(500),
  order_num INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  site_name VARCHAR(255) DEFAULT 'STI Archives',
  site_description TEXT,
  contact_email VARCHAR(255),
  maintenance_mode BOOLEAN DEFAULT FALSE,
  allow_registrations BOOLEAN DEFAULT TRUE,
  default_user_role VARCHAR(50) DEFAULT 'user',
  carousel_interval INTEGER DEFAULT 5000,
  articles_per_page INTEGER DEFAULT 10,
  max_upload_size INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) UNIQUE NOT NULL,
  theme VARCHAR(50) DEFAULT 'light',
  fontSize INTEGER DEFAULT 14,
  layout VARCHAR(50) DEFAULT 'split',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default site settings
INSERT INTO site_settings (id, site_name, site_description, contact_email)
VALUES (1, 'STI Archives', 'STI College Calamba Research Archives', 'stiarchivesorg@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now)
DROP POLICY IF EXISTS "allow_all_users" ON users;
CREATE POLICY "allow_all_users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_activity" ON activity_logs;
CREATE POLICY "allow_all_activity" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_articles" ON articles;
CREATE POLICY "allow_all_articles" ON articles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_uploads" ON user_uploads;
CREATE POLICY "allow_all_uploads" ON user_uploads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_carousel" ON carousel;
CREATE POLICY "allow_all_carousel" ON carousel FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_settings" ON site_settings;
CREATE POLICY "allow_all_settings" ON site_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_preferences" ON user_preferences;
CREATE POLICY "allow_all_preferences" ON user_preferences FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_year ON articles(year);
CREATE INDEX IF NOT EXISTS idx_user_uploads_status ON user_uploads(status);
CREATE INDEX IF NOT EXISTS idx_user_uploads_user_id ON user_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_carousel_order ON carousel(order_num);

-- Insert sample carousel items
INSERT INTO carousel (carousel_id, title, description, image_url, order_num, is_active)
VALUES 
  ('carousel-1', 'Welcome to STI Archives', 'Browse research papers and documents', 'https://stiarchive.example.com/images/carousel1.jpg', 1, true),
  ('carousel-2', 'Research Papers', 'Access student research papers', 'https://stiarchive.example.com/images/carousel2.jpg', 2, true),
  ('carousel-3', 'Document Archive', 'View archived documents', 'https://stiarchive.example.com/images/carousel3.jpg', 3, true)
ON CONFLICT (carousel_id) DO NOTHING;
