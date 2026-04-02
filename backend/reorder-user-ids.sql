-- Directly reorder user IDs using the existing id column
-- Assign sequential IDs 1, 2, 3, 4... in the exact order requested

UPDATE users SET
    id = new_id
FROM (
    SELECT
        id as old_id,
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
        ) as new_id
    FROM users
) as ordered_users
WHERE users.id = ordered_users.old_id;

-- Reset the sequence to continue from the highest ID + 1
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Verify the results
SELECT id, fullname, email, role, user_type
FROM users
ORDER BY id;