-- Update admin password to use bcrypt hash
-- Run this in Supabase SQL Editor
-- The bcrypt hash for 'admin123' is: $2a$10$...
-- But we need to generate a new one

-- First, let's generate a hash using a simple approach
-- Since we can't run bcrypt directly in SQL, we'll use the API endpoint

-- Instead, run this JavaScript in your browser console to generate a hash:
/*
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('admin123', 10));
*/

-- Or, simply update the admin user with a plain text password
-- and the next time they login, it will be hashed properly
-- Actually, let's use the create-user API endpoint to update the password

-- For now, let's just verify the user exists and update their role if needed
-- The password will be hashed when they update it through the proper flow
