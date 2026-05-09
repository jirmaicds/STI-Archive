// pages/api/analytics/page-duration.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://eopbqatvianrjkdbypvk.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcGJxYXR2aWFucmprZGJ5cHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzA4OTIsImV4cCI6MjA4OTEwNjg5Mn0.k9_xTbjwRdwAQJ9UgGGsosjLWywzxHuYOq-JbGeII8g';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, sessionId, page, duration, timestamp, userAgent } = req.body;

    // Insert into Supabase table
    const { data, error } = await supabase
      .from('page_durations')
      .insert([{ user_id: userId, session_id: sessionId, page, duration, timestamp, user_agent: userAgent }]);

    if (error) throw error;

    res.status(200).json({ message: 'Data inserted successfully' });
  } catch (error) {
    console.error('Error inserting page duration:', error);
    res.status(500).json({ error: 'Failed to insert data' });
  }
}