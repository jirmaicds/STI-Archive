-- Supabase Database Schema for STI Archives
-- Run this in your Supabase SQL Editor

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

-- Articles Table (for research papers)
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

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can register" ON users
  FOR INSERT WITH CHECK (true);

-- Create policies for activity_logs table
CREATE POLICY "Admin can view all logs" ON activity_logs
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'coadmin', 'subadmin')
  );

CREATE POLICY "Admin can insert logs" ON activity_logs
  FOR INSERT WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'coadmin', 'subadmin')
  );

-- Create policies for articles table
CREATE POLICY "Anyone can view articles" ON articles
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage articles" ON articles
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'coadmin')
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_year ON articles(year);

-- Insert sample admin user (password: admin123)
-- NOTE: Change the password hash in production
INSERT INTO users (email, password, fullname, role, verified)
VALUES (
  'admin@stiarchives.edu',
  '$2a$10$8K1p/a0dL3.XQ/Z7Y5J4/.Vq5J5J5J5J5J5J5J5J5J5J5J5J5J5J5',
  'System Administrator',
  'admin',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Documents Table (for user-created documents)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_id VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT DEFAULT '',
  content_html TEXT DEFAULT '',
  paper_size VARCHAR(50) DEFAULT 'letter',
  is_sti_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Carousel Table
CREATE TABLE IF NOT EXISTS carousel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carousel_id VARCHAR(50) UNIQUE NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  description TEXT,
  pdf_id VARCHAR(100),
  pdf_path VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Files Table (for uploaded files/documents)
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id VARCHAR(50) UNIQUE NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) DEFAULT 'pdf',
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  category VARCHAR(100) DEFAULT '',
  title VARCHAR(255) DEFAULT '',
  description TEXT DEFAULT '',
  uploaded_by UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Uploads Table (for pending user uploads)
CREATE TABLE IF NOT EXISTS user_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  title VARCHAR(255),
  authors VARCHAR(255),
  abstract TEXT,
  category VARCHAR(100),
  level VARCHAR(100),
  strand VARCHAR(100),
  program VARCHAR(100),
  year VARCHAR(10),
  citation TEXT,
  file_id VARCHAR(50),
  filename VARCHAR(255),
  file_path TEXT,
  file_size BIGINT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- Enable RLS on new tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_uploads ENABLE ROW LEVEL SECURITY;

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_carousel_order ON carousel(display_order);
CREATE INDEX IF NOT EXISTS idx_carousel_active ON carousel(is_active);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_user_uploads_status ON user_uploads(status);
CREATE INDEX IF NOT EXISTS idx_user_uploads_user_id ON user_uploads(user_id);