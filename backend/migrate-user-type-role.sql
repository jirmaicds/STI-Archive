-- Migration to separate user_type and role properly
-- user_type: 'user' or 'admin' (binary admin flag)
-- role: 'shs', 'college', 'teacher', 'admin', 'coadmin', 'subadmin' (specific role)

-- Step 1: Set user_type based on admin roles
UPDATE users SET user_type = 'admin' WHERE role IN ('admin', 'coadmin', 'subadmin', 'Admin', 'Co-Admin', 'Sub-Admin');
UPDATE users SET user_type = 'user' WHERE user_type IS NULL OR user_type NOT IN ('user', 'admin');

-- Step 2: Normalize role values
UPDATE users SET role = 'admin' WHERE role = 'Admin';
UPDATE users SET role = 'coadmin' WHERE role = 'Co-Admin';
UPDATE users SET role = 'subadmin' WHERE role = 'Sub-Admin';
UPDATE users SET role = 'pending' WHERE role IS NULL OR role = '';

-- Step 3: Set default roles for regular users
UPDATE users SET role = 'student' WHERE role = 'user' AND user_type = 'user';

-- Step 4: Fix specific admin users
UPDATE users SET user_type = 'admin', role = 'coadmin' WHERE fullname = 'admin2';
UPDATE users SET user_type = 'admin', role = 'subadmin' WHERE fullname = 'admin3';
UPDATE users SET user_type = 'admin', role = 'admin' WHERE fullname ILIKE '%admin%' AND fullname NOT IN ('admin2', 'admin3') AND user_type = 'user';

-- Step 5: Ensure all admin role users are verified
UPDATE users SET verified = true WHERE role IN ('admin', 'coadmin', 'subadmin');