import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { extractClientIP } from '../_shared/ipExtraction.ts'

interface VoteRequest {
  formation: string;
  format: string;
}

interface VoteResponse {
  success: boolean;
  message: string;
  error?: string;
}

console.log('🗳️ Submit Formation Vote Edge Function starting...');

Deno.serve(async (req) => {
  console.log(`📥 Received ${req.method} request to ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`❌ Method ${req.method} not allowed`);
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    console.log('🔍 Checking environment variables...');
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing environment variables' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔑 Authorization header present');

    // Initialize Supabase client with user context (using anon key for RLS compatibility)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    console.log('✅ Supabase client initialized with anon key for RLS compatibility');

    // Parse request body
    let requestBody: VoteRequest;
    try {
      requestBody = await req.json();
      console.log('📋 Request parsed:', {
        formation: requestBody.formation,
        format: requestBody.format
      });
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { formation, format } = requestBody;

    // Validate required parameters
    if (!formation || !format) {
      console.error('❌ Missing required parameters');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: formation and format are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Basic input validation
    const formationPattern = /^[\w\-]+$/; // Allow alphanumeric, hyphens
    const formatPattern = /^[\w\d]+$/; // Allow alphanumeric
    
    if (!formationPattern.test(formation) || formation.length > 20) {
      console.error('❌ Invalid formation format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid formation format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!formatPattern.test(format) || format.length > 10) {
      console.error('❌ Invalid format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Rate limiting check (simple implementation)
    const clientIP = extractClientIP(req);
    console.log(`🔍 Formation vote request from IP: ${clientIP}, formation: ${formation}, format: ${format}`);

    // Get current user (for logging purposes - auth is handled by database function)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Call database function to submit vote with proper RLS context
    console.log('🎯 Calling database function to submit formation vote...');
    
    const { data: dbResult, error: dbError } = await supabase.rpc('submit_formation_vote', {
      p_formation: formation,
      p_format: format
    });

    if (dbError) {
      console.error('❌ Database function error:', dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Unable to submit your vote at this time. Please try again later.',
          error: 'database_error'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process the database function response
    if (!dbResult || !dbResult.success) {
      console.log('⚠️ Database function returned error:', dbResult?.error, dbResult?.message);
      
      // Handle specific error types from database function
      let statusCode = 400;
      if (dbResult?.error === 'duplicate_vote') {
        statusCode = 409;
      } else if (dbResult?.error === 'authentication_required') {
        statusCode = 401;
      } else if (dbResult?.error === 'database_error') {
        statusCode = 500;
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: dbResult?.message || 'Unable to submit your vote at this time.',
          error: dbResult?.error || 'unknown_error'
        }),
        { 
          status: statusCode, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Formation vote recorded successfully via database function:', dbResult.data);

    // Return success response
    const successResponse: VoteResponse = {
      success: true,
      message: dbResult.message || `Your vote for the ${formation} formation in ${format} format has been recorded!`
    };

    console.log('🎉 Vote submission complete - returning success response');
    return new Response(
      JSON.stringify(successResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Unexpected error - Edge Function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
