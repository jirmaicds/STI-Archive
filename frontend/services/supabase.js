/**
 * Supabase Client for Frontend
 * Use this for direct Supabase calls from the browser
 * Include this file AFTER the Supabase CDN script
 */

const SUPABASE_URL = 'https://eopbqatvianrjkdbypvk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcGJhdHZpYW5yamtkYnlwdmsiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MjU0MzIwMCwiZXhwIjoxOTU4MTE5MjAwfQ.sb_publishable_4M4FhS5Mv8pFVQnAGJ5cPQ_eOZN-mdm';

// Create browser client if not already created
if (typeof window.supabase === 'undefined') {
  // Load Supabase from CDN
  document.write('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\/script>');
}

window.supabase = window.supabase || {};

// Initialize client when Supabase is available
function initSupabase() {
  if (typeof window.supabase.createClient === 'function') {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase client initialized');
    return true;
  }
  return false;
}

// Try to initialize immediately, or wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initSupabase, 100);
  });
} else {
  setTimeout(initSupabase, 100);
}

// Helper functions
window.supabaseHelpers = {
  async getTableData(tableName) {
    const { data, error } = await window.supabase.from(tableName).select('*');
    if (error) throw error;
    return data;
  },

  async insertData(tableName, data) {
    const { data: result, error } = await window.supabase.from(tableName).insert([data]);
    if (error) throw error;
    return result;
  },

  async updateData(tableName, id, data) {
    const { data: result, error } = await window.supabase.from(tableName).update(data).eq('id', id);
    if (error) throw error;
    return result;
  },

  async deleteData(tableName, id) {
    const { error } = await window.supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async signIn(email, password) {
    const { data, error } = await window.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signUp(email, password) {
    const { data, error } = await window.supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await window.supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  },

  async getUser() {
    const { data: { user }, error } = await window.supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async uploadFile(bucket, path, file) {
    const { data, error } = await window.supabase.storage
      .from(bucket)
      .upload(path, file);
    if (error) throw error;
    return data;
  },

  async getFileUrl(bucket, path) {
    const { data } = window.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
};
