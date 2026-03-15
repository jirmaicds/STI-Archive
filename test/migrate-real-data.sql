-- Migrate real data from JSON files to Supabase
-- Run this in your Supabase SQL Editor

-- 1. Insert Users from users.json
INSERT INTO users (email, password, fullname, role, isActive, created_at, updated_at) VALUES
('admin@clmb.sti.archives', '$2y$10$cznw/QRur3ZbWyI6fzYMtuD5LFFiFFUxHXrbc8MmaHk0Zbk/2oKXS', 'Admin', 'admin', true, '2026-03-05T10:21:17.977Z', '2026-03-05T10:21:17.978Z'),
('test@sti.archives', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User', 'user', true, '2026-03-05T10:21:17.977Z', '2026-03-05T10:21:17.978Z'),
('admin2@gmail.com', '$2y$10$KHtdcucc5EQc0uq0drDAMu0XXuPo6uzZHRrDuUQsFyexSm2InVYFm', 'Admin2', 'coadmin', true, '2026-03-08T08:53:32+00:00', '2026-03-08T08:53:32+00:00'),
('admin3@gmail.com', '$2y$10$oqhyoWG7LR6A6x8Xr960v.qLMfpYeFDjC8IRIhzS.xxwiHAfUEyF2', 'Admin3', 'subadmin', true, '2026-03-09T16:53:40+00:00', '2026-03-09T16:53:40+00:00')
ON CONFLICT (email) DO UPDATE SET 
  role = EXCLUDED.role,
  fullname = EXCLUDED.fullname,
  isActive = EXCLUDED.isActive;

-- 2. Insert Carousel items from carousel.json
INSERT INTO carousel (carousel_id, image_url, title, author, description, pdf_id, pdf_path, display_order, is_active) VALUES
('carousel-1', '/frontend/assets/images/paper2.png', 'Urban vs. Rural perspective', 'Santibanez, J. et al. - 2024 STI College Calamba', 'A study compares urban and rural gasoline stations', 'article-1', '/Studies/Research/2023-2024/urban-rural.pdf', 1, true),
('carousel-2', '/frontend/assets/images/paper2.png', 'Digital Library Management System', 'ITMAWD 21 GROUP 1 — STI College Calamba', 'A comprehensive web-based digital library system.', 'article-2', '/Studies/Research/2023-2024/digital-library.pdf', 2, true),
('carousel-3', '/frontend/assets/images/paper2.png', 'Creative Design', 'Pedro Reyes — Aug 25, 2025', 'A UI/UX project showcasing modern school apps.', 'article-3', '/Studies/Research/2023-2024/creative-design.pdf', 3, true),
('carousel-4', '/frontend/assets/images/paper2.png', 'Mobile App UI', 'Anna Cruz — Aug 28, 2025', 'A mobile app design for student productivity.', 'article-4', '/Studies/Research/2023-2024/mobile-app.pdf', 4, true)
ON CONFLICT (carousel_id) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- 3. Insert User Uploads from user_uploads.json
INSERT INTO user_uploads (upload_id, user_id, user_email, user_name, title, authors, abstract, category, level, strand, program, year, citation, file_id, filename, file_path, status, uploaded_at) VALUES
('user_1772145313296_a7j4wdxp9', 'testuser@clmb.sti.archives', 'testuser@clmb.sti.archives', 'Test User', 'Test Upload', 'John Doe', 'Test abstract', 'research', 'college', 'ABM', 'BSCS', '2024', 'Test citation', 'user_pdf_1772145313296', 'test.pdf', 'c:\Users\JD\Desktop\IT21.NEWCODE\IT21.NEWCODE\uploads\user_pdf_1772145313296_1772145313296_test.pdf', 'pending', '2026-02-26T22:35:13.298Z'),
('user_1772146198633_n5y3enm9d', 'user@clmb.sti.archives', 'user@clmb.sti.archives', 'Test User', 'dsadad', 'dsadad', 'dasda', 'research', 'shs', 'ABM', 'BSCS', '2024', 'asdasdadadasda', 'user_pdf_1772146198633', 'test_raf.pdf', 'c:\Users\JD\Desktop\IT21.NEWCODE\IT21.NEWCODE\uploads\user_pdf_1772146198633_1772146198634_test_raf.pdf', 'pending', '2026-02-26T22:49:58.637Z'),
('user_1772149838978_5taxmfrms', 'user@clmb.sti.archives', 'user@clmb.sti.archives', 'Test User', 'dsfadsf', 'fsdgs', 'fsdfsfsdfsdfss', 'research', 'shs', 'ABM', 'BSCS', '2024', 'sgfsegfsee', 'user_pdf_1772149838978', 'test_raf.pdf', 'C:\Users\JD\Desktop\IT21.NEWCODE\IT21.NEWCODE\uploads\user_pdf_1772149838978_1772149838978_test_raf.pdf', 'pending', '2026-02-26T23:50:38.982Z'),
('user_1772157861483_zosmcvf50', 'user@clmb.sti.archives', 'user@clmb.sti.archives', 'Test User', 'asdaddad', 'asdda`', 'adqsada', 'research', 'shs', 'ABM', 'BSCS', '2024', 'sadfwdwqd', 'user_pdf_1772157861483', 'test_raf.pdf', 'C:\Users\JD\Desktop\IT21.NEWCODE\IT21.NEWCODE\uploads\user_pdf_1772157861483_1772157861483_test_raf.pdf', 'pending', '2026-02-27T02:04:21.500Z')
ON CONFLICT (upload_id) DO UPDATE SET status = EXCLUDED.status;

SELECT 'Data migrated successfully!' as message;
