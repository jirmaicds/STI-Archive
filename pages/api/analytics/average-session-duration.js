// pages/api/analytics/average-session-duration.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://eopbqatvianrjkdbypvk.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcGJxYXR2aWFucmprZGJ5cHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzA4OTIsImV4cCI6MjA4OTEwNjg5Mn0.k9_xTbjwRdwAQJ9UgGGsosjLWywzxHuYOq-JbGeII8g';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get data from last 24 hours (since tracking script already excludes admins, we can query directly)
    const { data, error } = await supabase
      .from('page_durations')
      .select('user_id, duration')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    // Group by user_id and sum durations (total session time per user)
    const userTotals = {};
    data.forEach(row => {
      if (row.user_id) {
        userTotals[row.user_id] = (userTotals[row.user_id] || 0) + row.duration; // Duration in seconds
      }
    });

    // Calculate average session duration in hours
    const totals = Object.values(userTotals);
    if (totals.length === 0) {
      return res.json({ averageHours: 0 });
    }

    const averageSeconds = totals.reduce((sum, dur) => sum + dur, 0) / totals.length;
    const averageHours = averageSeconds / 3600;

    res.json({ averageHours: Math.round(averageHours * 10) / 10 }); // Round to 1 decimal
  } catch (error) {
    console.error('Error calculating average session duration:', error);
    res.status(500).json({ error: 'Failed to calculate average' });
  }
}