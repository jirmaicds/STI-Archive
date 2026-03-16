-- Create users table with correct column order
-- Run this in Supabase SQL Editor

-- Drop existing table (use CASCADE to remove dependencies)
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with column order: id, email, password, fullname, ...
CREATE TABLE users (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
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
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE (email)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow all operations
DROP POLICY IF EXISTS "allow_all_users" ON users;
CREATE POLICY "allow_all_users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insert test users with password "admin123" for all
-- Hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy = "admin123"
INSERT INTO users (email, password, fullname, role, verified, isActive) VALUES
('admin@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin', 'admin', true, true),
('admin2@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin2', 'admin', true, true),
('admin3@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin3', 'admin', true, true),
('test@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Test User', 'user', true, true)
ON CONFLICT (email) DO NOTHING;

-- View users to verify column order
SELECT * FROM users;
