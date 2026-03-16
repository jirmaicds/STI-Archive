-- Drop users table with CASCADE (removes dependent objects)
-- Run this in Supabase SQL Editor

DROP TABLE IF EXISTS users CASCADE;

-- This will also drop:
-- - activity_logs constraints
-- - documents constraints  
-- - files constraints
-- - user_uploads constraints
-- - policies on related tables

-- Then recreate the users table:
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  fullname VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'pending',
  verified BOOLEAN DEFAULT false,
  isActive BOOLEAN DEFAULT true,
  activation_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_code VARCHAR(10),
  reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow all operations
CREATE POLICY "allow_all_users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Insert users with password "admin123" for all
INSERT INTO users (email, password, fullname, role, verified, isActive) VALUES
('admin@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin', 'admin', true, true),
('admin2@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin2', 'admin', true, true),
('admin3@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin3', 'admin', true, true),
('test@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Test User', 'user', true, true)
ON CONFLICT (email) DO NOTHING;

SELECT * FROM users;
