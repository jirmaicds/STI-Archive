-- Convert UUID id column to SERIAL integers
-- Simplified version focusing only on users table

-- Add a temporary integer column
ALTER TABLE users ADD COLUMN temp_id SERIAL;

-- Update the temp_id with sequential numbers based on current order
UPDATE users SET temp_id = new_id
FROM (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY created_at) as new_id
    FROM users
) as temp_order
WHERE users.id = temp_order.id;

-- Drop the old UUID primary key constraint
ALTER TABLE users DROP CONSTRAINT users_pkey;

-- Rename columns
ALTER TABLE users RENAME COLUMN id TO old_uuid;
ALTER TABLE users RENAME COLUMN temp_id TO id;

-- Make id the new primary key
ALTER TABLE users ADD PRIMARY KEY (id);

-- Recreate the sequence
CREATE SEQUENCE IF NOT EXISTS users_id_seq OWNED BY users.id;
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Drop the old UUID column
ALTER TABLE users DROP COLUMN old_uuid;

-- Recreate indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_user_type;
DROP INDEX IF EXISTS idx_users_program;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_program ON users(program);

-- Verify the conversion
SELECT id, fullname, email, role, user_type FROM users ORDER BY id;