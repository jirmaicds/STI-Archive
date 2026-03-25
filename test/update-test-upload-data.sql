-- Update the test article with proper description and file_path
-- Run this in Supabase SQL Editor

UPDATE user_uploads 
SET 
  description = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry''s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.',
  file_path = 'https://eopbqatvianrjkdbypvk.supabase.co/storage/v1/object/public/Studies/Research/2023-2024/Cejes%20et%20al.pdf',
  file_name = 'Cejes et al.pdf',
  file_type = 'pdf',
  category = 'Research',
  status = 'pending'
WHERE title = 'Test Article';

-- If no rows updated, insert the test article with correct data
INSERT INTO user_uploads (id, user_id, title, description, file_path, file_name, file_type, category, status, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Test Article', 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry''s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.', 'https://eopbqatvianrjkdbypvk.supabase.co/storage/v1/object/public/Studies/Research/2023-2024/Cejes%20et%20al.pdf', 'Cejes et al.pdf', 'pdf', 'Research', 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  file_path = EXCLUDED.file_path,
  file_name = EXCLUDED.file_name,
  file_type = EXCLUDED.file_type,
  category = EXCLUDED.category,
  status = EXCLUDED.status;
