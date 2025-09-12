import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Check if we're in a test environment
const isTestEnvironment = process.env.NODE_ENV === 'test';

// Use dummy values for testing to prevent test failures
const testUrl = 'https://test.supabase.co';
const testKey = 'test-anon-key';


// Only throw error in non-test environments
if (!supabaseUrl || !supabaseAnonKey) {
  if (!isTestEnvironment) {
    throw new Error(
      'Missing Supabase environment variables. Please check that REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in your .env.local file.'
    );
  }
}

// Create and export the Supabase client
export const supabase = createClient(
  supabaseUrl || testUrl, 
  supabaseAnonKey || testKey, 
  {
  auth: {
    // Configure auth settings
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for enhanced security
    debug: false, // Disable Supabase auth debug logging
  },
  // Configure database settings
  db: {
    schema: 'public',
  },
  // Configure global headers
  global: {
    headers: {
      'X-Client-Info': 'dif-f16-6-coach-app',
    },
  },
});

// Helper function to get the current user session
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error.message);
    return null;
  }
  return session;
};

// Helper function to get the current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error.message);
    return null;
  }
  return user;
};

// Export default for easier imports
export default supabase;