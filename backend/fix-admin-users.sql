-- Fix admin users to have correct user_type and appear in admin table
-- Run this in Supabase SQL Editor

-- 1. Fix users with admin roles but wrong/missing user_type
UPDATE users SET user_type = 'admin' WHERE role = 'admin' AND (user_type IS NULL OR user_type = '' OR user_type NOT IN ('admin', 'coadmin', 'subadmin'));
UPDATE users SET user_type = 'coadmin' WHERE role = 'coadmin' AND (user_type IS NULL OR user_type = '' OR user_type NOT IN ('admin', 'coadmin', 'subadmin'));
UPDATE users SET user_type = 'subadmin' WHERE role = 'subadmin' AND (user_type IS NULL OR user_type = '' OR user_type NOT IN ('admin', 'coadmin', 'subadmin'));

-- 2. Fix users with admin in their name (like admin2, admin3) to be admin type
UPDATE users SET user_type = 'admin', role = 'admin', verified = true
WHERE (fullname ILIKE '%admin%' OR email ILIKE '%admin%')
AND user_type NOT IN ('admin', 'coadmin', 'subadmin');

-- 3. Ensure all admin-type users are verified and active
UPDATE users SET verified = true, isactive = true
WHERE user_type IN ('admin', 'coadmin', 'subadmin');