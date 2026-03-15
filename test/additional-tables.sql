-- Additional tables for STI Archives

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  theme VARCHAR(50) DEFAULT 'light',
  fontSize INTEGER DEFAULT 14,
  layout VARCHAR(50) DEFAULT 'split',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  site_name VARCHAR(255) DEFAULT 'STI Archives',
  site_description TEXT,
  contact_email VARCHAR(255),
  maintenance_mode BOOLEAN DEFAULT FALSE,
  allow_registrations BOOLEAN DEFAULT TRUE,
  default_user_role VARCHAR(50) DEFAULT 'user',
  carousel_interval INTEGER DEFAULT 5000,
  articles_per_page INTEGER DEFAULT 10,
  max_upload_size INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default site settings if not exists
INSERT INTO site_settings (id, site_name, site_description, contact_email)
VALUES (1, 'STI Archives', 'STI College Calamba Research Archives', 'stiarchivesorg@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Policy for user preferences (users can only read/update their own)
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (true);

-- Policy for site settings (public read, admin write)
DROP POLICY IF EXISTS "Public can read site settings" ON site_settings;
CREATE POLICY "Public can read site settings" ON site_settings
  FOR SELECT USING (true);
