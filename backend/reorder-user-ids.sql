-- DANGER: Convert UUID primary keys to sequential integers
-- This will change all primary keys and update foreign key relationships
-- BACKUP YOUR DATA FIRST!

-- Step 1: Create backup
CREATE TABLE users_backup AS SELECT * FROM users;

-- Step 2: Create ordered mapping
CREATE TEMP TABLE user_reorder AS
SELECT
    ROW_NUMBER() OVER (
        ORDER BY
            CASE
                WHEN fullname = 'Test User' THEN 1
                WHEN fullname = 'Admin' THEN 2
                WHEN fullname = 'Admin2' THEN 3
                WHEN fullname = 'Admin3' THEN 4
                ELSE 5
            END,
            fullname,
            created_at
    ) as new_id,
    id as old_id,
    fullname,
    email
FROM users;

-- Step 3: Update foreign key references
UPDATE activity_logs
SET admin_id = ur.new_id
FROM user_reorder ur
WHERE activity_logs.admin_id = ur.old_id::text;

UPDATE activity_logs
SET target_user_id = ur.new_id
FROM user_reorder ur
WHERE activity_logs.target_user_id = ur.old_id::text;

UPDATE documents
SET user_id = ur.new_id
FROM user_reorder ur
WHERE documents.user_id = ur.old_id::text;

UPDATE user_uploads
SET user_id = ur.new_id
FROM user_reorder ur
WHERE user_uploads.user_id = ur.old_id::text;

UPDATE files
SET uploaded_by = ur.new_id
FROM user_reorder ur
WHERE files.uploaded_by = ur.old_id::text;

-- Step 4: Drop and recreate users table with SERIAL primary key
DROP TABLE users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'pending',
    user_type TEXT DEFAULT 'user' CHECK (user_type IN ('user', 'admin')),
    CONSTRAINT role_check CHECK (role IN ('shs', 'college', 'teacher', 'admin', 'coadmin', 'subadmin', 'pending')),
    program VARCHAR(100),
    verified BOOLEAN DEFAULT FALSE,
    activation_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_code VARCHAR(10),
    reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Insert data with new sequential IDs
INSERT INTO users (
    id, email, password, fullname, role, user_type, program, verified,
    activation_token, reset_token, reset_code, reset_expires, created_at, updated_at
)
SELECT
    ur.new_id,
    ub.email,
    ub.password,
    ub.fullname,
    ub.role,
    ub.user_type,
    ub.program,
    ub.verified,
    ub.activation_token,
    ub.reset_token,
    ub.reset_code,
    ub.reset_expires,
    ub.created_at,
    ub.updated_at
FROM users_backup ub
JOIN user_reorder ur ON ub.id = ur.old_id;

-- Step 6: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_program ON users(program);

-- Step 7: Verify results
SELECT id, fullname, email, role, user_type FROM users ORDER BY id;

-- Step 8: Clean up (uncomment when satisfied with results)
-- DROP TABLE users_backup;
-- DROP TABLE user_reorder;