-- Create pending_uploads table
CREATE TABLE pending_uploads (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending'
);

-- Create approved_uploads table
CREATE TABLE approved_uploads (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE,
    approved_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by TEXT NOT NULL
);

-- Create storage bucket 'uploads' if not exists (via Supabase dashboard)

-- Enable RLS if needed
ALTER TABLE pending_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_uploads ENABLE ROW LEVEL SECURITY;