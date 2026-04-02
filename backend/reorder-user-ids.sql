-- Reorder existing user IDs to sequential numbering 1-4 as requested
-- This updates the id field directly without creating new columns
-- BACKUP YOUR DATA FIRST!

-- Create backup of current users table
CREATE TABLE users_backup AS SELECT * FROM users;

-- Create a temporary sequence to generate new IDs
CREATE TEMP SEQUENCE temp_user_id_seq START 1;

-- Update user IDs in the specific order requested
-- Reset the sequence
SELECT setval('temp_user_id_seq', 1, false);

-- Update IDs in the desired order
WITH ordered_users AS (
    SELECT
        id,
        nextval('temp_user_id_seq') as new_id
    FROM users
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
)
UPDATE users
SET id = ou.new_id
FROM ordered_users ou
WHERE users.id = ou.id;

-- Update the table's primary key sequence to continue from the highest ID
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Verify the results
SELECT id, fullname, email, role, user_type
FROM users
ORDER BY id;

-- Clean up temporary sequence
DROP SEQUENCE temp_user_id_seq;

-- To rollback if needed:
-- DROP TABLE users;
-- ALTER TABLE users_backup RENAME TO users;