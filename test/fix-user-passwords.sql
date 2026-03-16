-- SQL to fix user passwords in Supabase
-- Run this in Supabase SQL Editor
-- Password for all users will be: admin123

-- The valid bcrypt hash for "admin123" is:
-- $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

-- Update all users with the correct bcrypt hash for password "admin123"
UPDATE users 
SET password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE email IS NOT NULL;

-- Verify users
SELECT id, email, fullname, role, verified, isActive, 
       LENGTH(password) as pwd_length,
       SUBSTRING(password, 1, 7) as pwd_prefix
FROM users;
