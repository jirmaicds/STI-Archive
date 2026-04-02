-- Remove display_id column since we're now using sequential integer IDs
-- The id column is already SERIAL and provides sequential numbering

-- Remove the display_id column
ALTER TABLE users DROP COLUMN IF EXISTS display_id;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Verify the data
SELECT id, fullname, email, role, user_type
FROM users
ORDER BY id;