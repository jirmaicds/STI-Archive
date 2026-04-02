-- SAFER APPROACH: Add display_id column for sequential numbering
-- This preserves UUID primary keys and foreign key relationships

-- Add display_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_id SERIAL;

-- Update display_id with sequential numbers in desired order
-- Test User = 1, Admin = 2, Admin2 = 3, Admin3 = 4, others continue sequentially
WITH ordered_users AS (
    SELECT
        id,
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
        ) as display_order
    FROM users
)
UPDATE users
SET display_id = ou.display_order
FROM ordered_users ou
WHERE users.id = ou.id;

-- Verify the results
SELECT display_id, fullname, email, role, user_type
FROM users
ORDER BY display_id;