-- Add default users to Supabase
-- Run this in your Supabase SQL Editor

-- NOTE: Since you're using Supabase Auth, passwords are stored in auth.users
-- The users table just needs any non-null password value for the constraint

-- Update existing users or insert with any password (auth handles real passwords)
INSERT INTO users (email, password, fullname, role, verified) VALUES
('admin@clmb.sti.archives', '$2a$10$placeholder$', 'Admin', 'admin', true),
('admin2@clmb.sti.archives', '$2a$10$placeholder$', 'Admin2', 'admin', true),
('admin3@clmb.sti.archives', '$2a$10$placeholder$', 'Admin3', 'admin', true),
('user@clmb.sti.archives', '$2a$10$placeholder$', 'Test User', 'user', true)
ON CONFLICT (email) DO UPDATE SET 
  role = EXCLUDED.role,
  verified = EXCLUDED.verified,
  fullname = EXCLUDED.fullname,
  password = EXCLUDED.password;
