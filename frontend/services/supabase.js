/**
 * Supabase Client for Frontend
 * Use this for direct Supabase calls from the browser
 * Include this file AFTER the Supabase CDN script
 */

const SUPABASE_URL = 'https://eopbqatvianrjkdbypvk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcGJxYXR2aWFucmprZGJ5cHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzA4OTIsImV4cCI6MjA4OTEwNjg5Mn0.k9_xTbjwRdwAQJ9UgGGsosjLWywzxHuYOq-JbGeII8g';
const SUPABASE_STORAGE_URL = 'https://eopbqatvianrjkdbypvk.storage.supabase.co/storage/v1/s3';

// Only create client if not already created
if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
  // Load Supabase from CDN if not available
  document.write('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\/script>');
  setTimeout(function() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        storage: {
          baseUrl: SUPABASE_STORAGE_URL
        }
      });
      console.log('Supabase client initialized');
    }
  }, 100);
} else if (!window.supabase._isInitialized) {
  // Reuse existing window.supabase but ensure it's properly configured
  window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    storage: {
      baseUrl: SUPABASE_STORAGE_URL
    }
  });
  window.supabase._isInitialized = true;
  console.log('Supabase client reinitialized');
}

// Helper functions
window.supabaseHelpers = {
  async getTableData(tableName) {
    if (!window.supabase || !window.supabase.from) {
      throw new Error('Supabase not initialized');
    }
    const { data, error } = await window.supabase.from(tableName).select('*');
    if (error) throw error;
    return data;
  },

  async insertData(tableName, data) {
    if (!window.supabase || !window.supabase.from) {
      throw new Error('Supabase not initialized');
    }
    const { data: result, error } = await window.supabase.from(tableName).insert([data]);
    if (error) throw error;
    return result;
  },

  async updateData(tableName, id, data) {
    if (!window.supabase || !window.supabase.from) {
      throw new Error('Supabase not initialized');
    }
    const { data: result, error } = await window.supabase.from(tableName).update(data).eq('id', id);
    if (error) throw error;
    return result;
  },

  async deleteData(tableName, id) {
    if (!window.supabase || !window.supabase.from) {
      throw new Error('Supabase not initialized');
    }
    const { error } = await window.supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async signIn(email, password) {
    if (!window.supabase || !window.supabase.auth) {
      throw new Error('Supabase not initialized');
    }
    const { data, error } = await window.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signUp(email, password) {
    if (!window.supabase || !window.supabase.auth) {
      throw new Error('Supabase not initialized');
    }
    const { data, error } = await window.supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!window.supabase || !window.supabase.auth) {
      throw new Error('Supabase not initialized');
    }
    const { error } = await window.supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  },

  async getUser() {
    if (!window.supabase || !window.supabase.auth) {
      throw new Error('Supabase not initialized');
    }
    const { data: { user }, error } = await window.supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async uploadFile(bucket, path, file) {
    if (!window.supabase || !window.supabase.storage) {
      throw new Error('Supabase not initialized');
    }
    const { data, error } = await window.supabase.storage
      .from(bucket)
      .upload(path, file);
    if (error) throw error;
    return data;
  },

  async getFileUrl(bucket, path) {
    if (!window.supabase || !window.supabase.storage) {
      throw new Error('Supabase not initialized');
    }
    const { data } = window.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
};
