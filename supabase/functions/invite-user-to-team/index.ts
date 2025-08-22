import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface InvitationRequest {
  p_team_id: string;
  p_email: string;
  p_role: string;
  p_message?: string;
  p_redirect_url?: string;
  csrfToken?: string;
}

interface DatabaseInvitationResponse {
  success: boolean;
  invitation_id?: string;
  email?: string;
  team_name?: string;
  role?: string;
  message?: string;
  redirect_url?: string;
  error?: string;
}

console.log('🚀 Invite User to Team Edge Function starting...');

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3001';

    console.log('🔍 Checking environment variables...');
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
    console.log('SITE_URL:', siteUrl);

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
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

    // Initialize Supabase clients
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase clients initialized');

    // Parse request body
    let requestBody: InvitationRequest;
    try {
      requestBody = await req.json();
      console.log('📋 Request parsed:', {
        team_id: requestBody.p_team_id,
        email: requestBody.p_email,
        role: requestBody.p_role,
        has_message: !!requestBody.p_message
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

    const { p_team_id, p_email, p_role, p_message, p_redirect_url, csrfToken } = requestBody;

    // Validate required parameters
    if (!p_team_id || !p_email || !p_role) {
      console.error('❌ Missing required parameters');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: team_id, email, and role are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Enhanced input validation and sanitization
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRoles = ['admin', 'coach', 'parent', 'player'];
    const dangerousChars = /<>\"'`&|;{}()[]\\\/\0\r\n\t/g;

    // Validate email format
    if (!emailRegex.test(p_email)) {
      console.error('❌ Invalid email format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate role
    if (!validRoles.includes(p_role)) {
      console.error('❌ Invalid role');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid role specified' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for dangerous characters in inputs
    if (dangerousChars.test(p_email) || dangerousChars.test(p_role) || 
        (p_message && dangerousChars.test(p_message))) {
      console.error('❌ Invalid characters in input');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid characters in input' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate input lengths
    if (p_email.length > 320 || p_role.length > 20 || 
        (p_message && p_message.length > 500)) {
      console.error('❌ Input length exceeded');
      return new Response(
        JSON.stringify({ success: false, error: 'Input length limits exceeded' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Rate limiting check (simple implementation)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `invite:${clientIP}`;
    
    // In a real implementation, you'd use Redis or similar for rate limiting
    // For now, we'll log potential abuse patterns
    console.log(`🔍 Invitation request from IP: ${clientIP}, email: ${p_email}`);
    
    // Detect potential bot requests
    const userAgent = req.headers.get('user-agent') || '';
    if (!userAgent || /bot|crawler|spider|scraper|curl|wget|python|node/i.test(userAgent)) {
      console.warn('⚠️ Potential bot request detected:', userAgent);
    }

    // Construct environment-aware redirect URL
    const redirectUrl = p_redirect_url || `${siteUrl}/?invitation=true&team=${encodeURIComponent(p_team_id)}&role=${encodeURIComponent(p_role)}`;
    console.log('🔗 Using redirect URL:', redirectUrl);

    console.log('🎯 Step 1: Calling database function for validation and record creation...');

    // Step 1: Call existing database function to validate and create invitation record
    const { data: dbResponse, error: dbError } = await supabase.rpc('invite_user_to_team', {
      p_team_id,
      p_email,
      p_role,
      p_message: p_message || '',
      p_redirect_url: redirectUrl
    });

    if (dbError) {
      console.error('❌ Database function error:', dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database error: ${dbError.message}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const dbResult = dbResponse as DatabaseInvitationResponse;
    
    if (!dbResult?.success) {
      console.error('❌ Database function returned error:', dbResult?.error);
      return new Response(
        JSON.stringify(dbResult || { success: false, error: 'Database operation failed' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Database invitation created successfully:', {
      invitation_id: dbResult.invitation_id,
      team_name: dbResult.team_name,
      redirect_url: dbResult.redirect_url ? 'Generated' : 'Not provided'
    });

    console.log('📧 Step 2: Sending email via Supabase Auth...');

    // Step 2: Send actual email via Supabase Auth
    try {
      const { data: emailData, error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        p_email,
        {
          redirectTo: dbResult.redirect_url,
          data: {
            // Include metadata for the invitation
            invitation_id: dbResult.invitation_id,
            team_name: dbResult.team_name,
            role: dbResult.role
          }
        }
      );

      if (emailError) {
        console.error('⚠️ Supabase email invitation error:', emailError);
        
        // Database record was created, but email failed - this is still a partial success
        const warningResponse = {
          success: true, // Database operation succeeded
          data: dbResult,
          warning: `Invitation record created but email sending failed: ${emailError.message}`,
          message: `Invitation created for ${p_email} but email could not be sent. You can share the invitation link manually.`
        };
        
        console.log('⚠️ Returning partial success response');
        return new Response(
          JSON.stringify(warningResponse),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('✅ Email invitation sent successfully:', {
        user_id: emailData.user?.id,
        email: emailData.user?.email
      });

      // Step 3: Return complete success response
      const successResponse = {
        success: true,
        data: {
          ...dbResult,
          auth_user_id: emailData.user?.id,
          email_sent: true
        },
        message: `Invitation sent successfully to ${p_email}! They will receive an email with instructions to join the team.`
      };

      console.log('🎉 Complete success - returning response');
      return new Response(
        JSON.stringify(successResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (emailException) {
      console.error('⚠️ Exception during email sending:', emailException);
      
      // Database record was created, but email failed
      const warningResponse = {
        success: true, // Database operation succeeded
        data: dbResult,
        warning: `Invitation record created but email sending failed: ${emailException.message}`,
        message: `Invitation created for ${p_email} but email could not be sent. You can share the invitation link manually.`
      };
      
      console.log('⚠️ Returning partial success response due to email exception');
      return new Response(
        JSON.stringify(warningResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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
