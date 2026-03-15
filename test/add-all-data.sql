-- Add sample data to Supabase
-- Run this in your Supabase SQL Editor

-- 1. Add Users (with hashed passwords - password is "admin123" for all)
INSERT INTO users (email, password, fullname, role, verified, isActive) VALUES
('admin@clmb.sti.archives', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin', 'admin', true, true),
('admin2@clmb.sti.archives', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin2', 'admin', true, true),
('admin3@clmb.sti.archives', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin3', 'admin', true, true),
('user@clmb.sti.archives', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Test User', 'user', true, true)
ON CONFLICT (email) DO UPDATE SET 
  role = EXCLUDED.role,
  verified = EXCLUDED.verified,
  fullname = EXCLUDED.fullname,
  isActive = EXCLUDED.isActive;

-- 2. Add Sample Articles (Research Papers)
INSERT INTO articles (title, authors, category, strand, level, program, year, type, topic, summary) VALUES
('The Impact of Digital Technology on Student Learning', 'John Smith', 'Research Paper', 'STEM', 'Grade 11', 'ICT', '2024', 'Quantitative', 'Technology in Education', 'This study examines how digital technology affects student learning outcomes in secondary education.'),
('Effects of Social Media on Academic Performance', 'Maria Garcia', 'Research Paper', 'ABM', 'Grade 12', 'Business', '2024', 'Qualitative', 'Social Media Impact', 'An investigation into how social media usage influences academic performance among high school students.'),
('Climate Change Awareness among Filipino Youth', 'Carlos Reyes', 'Research Paper', 'STEM', 'Grade 11', 'Science', '2023', 'Quantitative', 'Environmental Science', 'Measuring the level of climate change awareness among Filipino high school students.'),
('Online Learning Effectiveness Post-Pandemic', 'Sarah Johnson', 'Research Paper', 'General', 'Grade 12', 'Education', '2024', 'Mixed Methods', 'Education', 'A comprehensive study on the effectiveness of online learning compared to traditional classroom learning.'),
('Financial Literacy among Senior High Students', 'Michael Tan', 'Research Paper', 'ABM', 'Grade 12', 'Finance', '2024', 'Quantitative', 'Financial Education', 'Assessing the financial literacy levels of senior high school students in Metro Manila.')
ON CONFLICT DO NOTHING;

-- 3. Add Sample Carousel Items
INSERT INTO carousel (carousel_id, image_url, title, author, description, display_order, is_active) VALUES
('carousel-1', '/assets/images/carousel/carousel_1772632829.jpg', 'Welcome to STI Archives', 'Admin', 'Your digital library for research papers and academic resources', 1, true),
('carousel-2', '/assets/images/carousel/carousel_1772632895.png', 'New Research Papers Available', 'Admin2', 'Check out our latest collection of STEM research papers', 2, true),
('carousel-3', '/assets/images/STI Building.jpg', ' STI College', 'Admin3', 'Excellence in education since 1983', 3, true)
ON CONFLICT (carousel_id) DO NOTHING;

-- 4. Add Sample Documents
INSERT INTO documents (doc_id, title, content, paper_size, is_sti_template) VALUES
('doc-1', ' STI Research Format', 'Standard research paper format for all submissions', 'letter', true),
('doc-2', 'Thesis Template', 'Template for thesis and capstone projects', 'letter', true)
ON CONFLICT (doc_id) DO NOTHING;

-- 5. Add Sample Files
INSERT INTO files (file_id, filename, original_name, file_type, file_path, category, title, is_public) VALUES
('file-1', 'sample-paper.pdf', 'sample-paper.pdf', 'pdf', '/files/sample-paper.pdf', 'Research Paper', 'Sample Research Paper', true),
('file-2', 'research-guidelines.pdf', 'research-guidelines.pdf', 'pdf', '/files/research-guidelines.pdf', 'Guidelines', 'Research Writing Guidelines', true)
ON CONFLICT (file_id) DO NOTHING;

SELECT 'Data inserted successfully!' as message;
