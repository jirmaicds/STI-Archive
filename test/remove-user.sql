-- Remove specific users from Supabase
-- Run this in Supabase SQL Editor

-- Delete "System Administrator" user
DELETE FROM users WHERE fullname = 'System Administrator';

-- Optionally: Reset Test User password to something else
-- UPDATE users SET password = '$2a$10$placeholder$' WHERE fullname = 'Test User';

-- View remaining users
SELECT id, email, fullname, role, verified, isActive FROM users;
