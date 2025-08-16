import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Check if we're in a test environment
const isTestEnvironment = process.env.NODE_ENV === 'test';

// Use dummy values for testing to prevent test failures
const testUrl = 'https://test.supabase.co';
const testKey = 'test-anon-key';

// Debug logging for production troubleshooting - WHITESPACE ANALYSIS
if (process.env.NODE_ENV === 'production') {
  console.log('=== SUPABASE CLIENT WHITESPACE ANALYSIS ===');
  console.log('URL:', supabaseUrl);
  console.log('Key (JSON stringified):', JSON.stringify(supabaseAnonKey));
  console.log('Key length:', supabaseAnonKey?.length || 0);
  console.log('Contains newline:', supabaseAnonKey?.includes('\n') || false);
  console.log('Contains space:', supabaseAnonKey?.includes(' ') || false);
  console.log('Contains tab:', supabaseAnonKey?.includes('\t') || false);
  console.log('Contains carriage return:', supabaseAnonKey?.includes('\r') || false);
  
  // Show character codes around suspected break point (position 90-100)
  if (supabaseAnonKey && supabaseAnonKey.length > 90) {
    const suspectArea = supabaseAnonKey.substring(85, 105);
    console.log('Suspect area (chars 85-105):', JSON.stringify(suspectArea));
    console.log('Character codes in suspect area:', 
      Array.from(suspectArea).map((char, i) => `${85+i}: ${char} (${char.charCodeAt(0)})`));
  }
  
  console.log('Expected length: 211');
  console.log('=== END WHITESPACE ANALYSIS ===');
}

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