import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { isValidIpAddress } from '../_shared/ipValidation.ts'

// **SECURITY**: Enhanced security headers to prevent common attacks combined with CORS
const combinedHeaders = {
  ...corsHeaders,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';"
};

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

// **SECURITY**: Advanced rate limiting system with multiple tiers
interface RateLimitEntry {
  count: number;
  lastReset: number;
  blocked: boolean;
  violations: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  violationThreshold: number;
  blockDurationMs: number;
}

const RATE_LIMIT_CONFIGS = {
  perIP: { windowMs: 3600000, maxRequests: 10, violationThreshold: 3, blockDurationMs: 3600000 }, // 1 hour
  perUser: { windowMs: 3600000, maxRequests: 50, violationThreshold: 2, blockDurationMs: 1800000 }, // 30 min
  global: { windowMs: 3600000, maxRequests: 100, violationThreshold: 1, blockDurationMs: 600000 } // 10 min
};

// In-memory rate limiting store (would use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// **SECURITY**: Cleanup old rate limit entries
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries older than 2 hours
    if (now - entry.lastReset > 7200000) {
      rateLimitStore.delete(key);
    }
  }
}

// **SECURITY**: Check rate limit with escalating response
function checkRateLimit(identifier: string, config: RateLimitConfig): { allowed: boolean; delay?: number; message?: string } {
  const now = Date.now();
  const key = `${identifier}`;
  const entry = rateLimitStore.get(key) || { count: 0, lastReset: now, blocked: false, violations: 0 };

  // Check if currently blocked
  if (entry.blocked && now - entry.lastReset < config.blockDurationMs) {
    const remainingMs = config.blockDurationMs - (now - entry.lastReset);
    return {
      allowed: false,
      message: `Rate limit exceeded. Try again in ${Math.ceil(remainingMs / 60000)} minutes.`
    };
  }

  // Reset window if expired
  if (now - entry.lastReset >= config.windowMs) {
    entry.count = 0;
    entry.lastReset = now;
    entry.blocked = false;
  }

  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    entry.violations++;

    // Block if too many violations
    if (entry.violations >= config.violationThreshold) {
      entry.blocked = true;
      entry.lastReset = now;
      console.warn(`🚨 SECURITY: Rate limit violation - blocking ${identifier} for ${config.blockDurationMs / 60000} minutes`);
    }

    // Calculate exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, entry.violations), 30000); // Max 30 seconds

    rateLimitStore.set(key, entry);
    return {
      allowed: false,
      delay,
      message: `Rate limit exceeded. Please wait ${delay / 1000} seconds before retrying.`
    };
  }

  rateLimitStore.set(key, entry);
  return { allowed: true };
}

// **SECURITY**: Enhanced IP extraction with validation
function extractClientIP(req: Request): string {
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
    'x-cluster-client-ip'
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // Handle comma-separated IPs (take first one)
      const ip = value.split(',')[0].trim();
      // Basic IP validation
      if (isValidIpAddress(ip)) {
        return ip;
      }
    }
  }

  return 'unknown';
}

// **SECURITY**: Advanced bot detection with scoring
function calculateBotScore(userAgent: string, req: Request): number {
  let score = 0;

  if (!userAgent || userAgent.length < 10) {
    score += 0.4; // Missing or very short user agent
  }

  // Known bot patterns
  const botPatterns = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|python|node|go-http/i,
    /headless|phantom|selenium/i,
    /postman|insomnia|httpie/i
  ];

  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      score += 0.3;
      break;
    }
  }

  // Suspicious headers
  const suspiciousHeaders = ['x-requested-with', 'x-forwarded-proto'];
  const hasNormalBrowserHeaders = req.headers.get('accept-language') && req.headers.get('accept-encoding');

  if (!hasNormalBrowserHeaders) {
    score += 0.2;
  }

  // Very generic user agents
  if (/^Mozilla\/[45]\.0$/i.test(userAgent)) {
    score += 0.2;
  }

  return Math.min(score, 1.0);
}

// **SECURITY**: Structured security event logging
interface SecurityEvent {
  timestamp: string;
  event_type: 'rate_limit_exceeded' | 'bot_detected' | 'validation_failed' | 'privilege_escalation' | 'redirect_blocked' | 'successful_invite';
  severity: 'info' | 'warn' | 'error' | 'critical';
  client_ip: string;
  user_agent: string;
  user_id?: string;
  details: Record<string, any>;
  correlation_id: string;
}

function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    ...event,
    service: 'invite-user-to-team',
    version: '2.0.0'
  };

  // Structure logs for easy parsing by monitoring systems
  if (event.severity === 'critical' || event.severity === 'error') {
    console.error(`🚨 SECURITY_EVENT: ${JSON.stringify(logEntry)}`);
  } else if (event.severity === 'warn') {
    console.warn(`⚠️ SECURITY_EVENT: ${JSON.stringify(logEntry)}`);
  } else {
    console.log(`ℹ️ SECURITY_EVENT: ${JSON.stringify(logEntry)}`);
  }
}

function generateCorrelationId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// **SECURITY**: Input validation functions
function validateEmailFormat(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  if (email.length > 320) {
    return { valid: false, error: 'Email address too long' };
  }
  
  // RFC 5322 compliant email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email address format' };
  }
  
  return { valid: true };
}

function validateTeamId(teamId: string): { valid: boolean; error?: string } {
  if (!teamId || typeof teamId !== 'string') {
    return { valid: false, error: 'Team ID is required' };
  }
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(teamId)) {
    return { valid: false, error: 'Invalid team ID format' };
  }
  
  return { valid: true };
}

function validateRole(role: string): { valid: boolean; error?: string } {
  if (!role || typeof role !== 'string') {
    return { valid: false, error: 'Role is required' };
  }
  
  const validRoles = ['admin', 'coach', 'parent', 'player'];
  if (!validRoles.includes(role)) {
    return { valid: false, error: 'Invalid role specified' };
  }
  
  return { valid: true };
}

function sanitizeMessage(message: string): { sanitized: string; error?: string } {
  if (typeof message !== 'string') {
    message = '';
  }
  
  // Remove potential script tags and dangerous content
  let sanitized = message
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  
  // Limit length
  if (sanitized.length > 500) {
    return { sanitized: '', error: 'Message too long (max 500 characters)' };
  }
  
  return { sanitized: sanitized.trim() };
}

// **SECURITY**: Geographic anomaly detection (basic)
function detectGeographicAnomaly(ip: string, userAgent: string): { suspicious: boolean; reason?: string } {
  // Simple heuristics for geographic anomalies
  const suspiciousPatterns = [
    // VPN/Proxy indicators in User-Agent
    /VPN|Proxy|Tor/i,
    // Datacenter/hosting providers (basic detection)
    /DigitalOcean|AWS|Google Cloud|Azure|Linode/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent)) {
      return { suspicious: true, reason: `Suspicious user agent: ${pattern.toString()}` };
    }
  }

  // In production, this would integrate with IP geolocation services
  // and compare against user's typical locations
  return { suspicious: false };
}

// **SECURITY**: URL validation function to prevent open redirect attacks
function validateRedirectUrl(url: string, allowedDomains: string[]): boolean {
  try {
    // Handle relative URLs - they're safe as they stay within the same origin
    if (url.startsWith('/')) {
      return true;
    }

    // Parse the URL to validate structure
    const urlObj = new URL(url);

    // Only allow HTTPS for external redirects (security requirement)
    if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
      console.warn('🚨 SECURITY: Blocked non-HTTP(S) redirect:', url);
      return false;
    }

    // For production, enforce HTTPS only
    const isProd = Deno.env.get('ENVIRONMENT') === 'production';
    if (isProd && urlObj.protocol !== 'https:') {
      console.warn('🚨 SECURITY: Blocked non-HTTPS redirect in production:', url);
      return false;
    }

    // Check hostname against whitelist
    const isAllowed = allowedDomains.some(domain => {
      // Exact match
      if (urlObj.hostname === domain) return true;
      // Subdomain match (e.g., app.domain.com matches domain.com)
      if (urlObj.hostname.endsWith(`.${domain}`)) return true;
      return false;
    });

    if (!isAllowed) {
      console.warn('🚨 SECURITY: Blocked redirect to unauthorized domain:', urlObj.hostname);
    }

    return isAllowed;
  } catch (error) {
    // Invalid URL format
    console.warn('🚨 SECURITY: Blocked malformed redirect URL:', url, error.message);
    return false;
  }
}

Deno.serve(async (req) => {
  console.log(`📥 Received ${req.method} request to ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response('ok', { 
      headers: combinedHeaders,
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
        headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
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
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
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
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
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
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
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
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // **SECURITY**: Advanced input validation and sanitization
    console.log('🔍 SECURITY: Validating input parameters...');

    // Validate email with comprehensive checks
    const emailValidation = validateEmailFormat(p_email);
    if (!emailValidation.valid) {
      console.error(`❌ SECURITY: Email validation failed - ${emailValidation.error}`);
      return new Response(
        JSON.stringify({ success: false, error: emailValidation.error }),
        { status: 400, headers: { ...combinedHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate team ID format
    const teamIdValidation = validateTeamId(p_team_id);
    if (!teamIdValidation.valid) {
      console.error(`❌ SECURITY: Team ID validation failed - ${teamIdValidation.error}`);
      return new Response(
        JSON.stringify({ success: false, error: teamIdValidation.error }),
        { status: 400, headers: { ...combinedHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const roleValidation = validateRole(p_role);
    if (!roleValidation.valid) {
      console.error(`❌ SECURITY: Role validation failed - ${roleValidation.error}`);
      return new Response(
        JSON.stringify({ success: false, error: roleValidation.error }),
        { status: 400, headers: { ...combinedHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize message content
    const messageSanitization = sanitizeMessage(p_message || '');
    if (messageSanitization.error) {
      console.error(`❌ SECURITY: Message validation failed - ${messageSanitization.error}`);
      return new Response(
        JSON.stringify({ success: false, error: messageSanitization.error }),
        { status: 400, headers: { ...combinedHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedMessage = messageSanitization.sanitized;
    console.log('✅ SECURITY: All input validation passed');

    // **SECURITY**: Enhanced multi-tier rate limiting
    const clientIP = extractClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Periodic cleanup of rate limit store
    if (Math.random() < 0.1) { // 10% chance per request
      cleanupRateLimitStore();
    }

    // Check IP-based rate limit
    const ipLimit = checkRateLimit(`ip:${clientIP}`, RATE_LIMIT_CONFIGS.perIP);
    if (!ipLimit.allowed) {
      console.warn(`🚨 SECURITY: IP rate limit exceeded - ${clientIP}, UA: ${userAgent}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: ipLimit.message,
          retryAfter: ipLimit.delay ? Math.ceil(ipLimit.delay / 1000) : undefined
        }),
        {
          status: 429,
          headers: {
            ...combinedHeaders,
            'Content-Type': 'application/json',
            'Retry-After': ipLimit.delay ? String(Math.ceil(ipLimit.delay / 1000)) : '3600'
          }
        }
      );
    }

    // Check global rate limit (circuit breaker)
    const globalLimit = checkRateLimit('global', RATE_LIMIT_CONFIGS.global);
    if (!globalLimit.allowed) {
      console.error(`🚨 SECURITY: Global rate limit exceeded - system protection activated`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'System temporarily overloaded. Please try again later.',
          retryAfter: 600 // 10 minutes
        }),
        { 
          status: 503,
          headers: {
            ...combinedHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '600'
          }
        }
      );
    }

    // User-based rate limiting (after authentication)
    let userRateLimit = null;
    try {
      const authUser = await supabase.auth.getUser();
      if (authUser.data.user) {
        userRateLimit = checkRateLimit(`user:${authUser.data.user.id}`, RATE_LIMIT_CONFIGS.perUser);
        if (!userRateLimit.allowed) {
          console.warn(`🚨 SECURITY: User rate limit exceeded - ${authUser.data.user.id}`);
          return new Response(
            JSON.stringify({
              success: false,
              error: userRateLimit.message,
              retryAfter: userRateLimit.delay ? Math.ceil(userRateLimit.delay / 1000) : undefined
            }),
            {
              status: 429,
              headers: {
                ...combinedHeaders,
                'Content-Type': 'application/json',
                'Retry-After': userRateLimit.delay ? String(Math.ceil(userRateLimit.delay / 1000)) : '1800'
              }
            }
          );
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not check user rate limit:', error.message);
    }

    // **SECURITY**: Generate correlation ID for tracking
    const correlationId = generateCorrelationId();

    // **SECURITY**: Geographic anomaly detection
    const geoAnomaly = detectGeographicAnomaly(clientIP, userAgent);
    if (geoAnomaly.suspicious) {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'bot_detected', // Using existing type for suspicious activity
        severity: 'warn',
        client_ip: clientIP,
        user_agent: userAgent,
        details: { reason: geoAnomaly.reason, geographic_anomaly: true },
        correlation_id: correlationId
      });
    }

    console.log(`🔍 SECURITY: Request from IP: ${clientIP}, UA: ${userAgent.substring(0, 100)}, Correlation: ${correlationId}`);

    // **SECURITY**: Enhanced bot detection with scoring system
    const botScore = calculateBotScore(userAgent, req);
    if (botScore > 0.7) {
      console.warn(`🚨 SECURITY: High bot probability detected - Score: ${botScore}, IP: ${clientIP}, UA: ${userAgent}`);
      // For high bot scores, apply stricter rate limiting
      const botLimit = checkRateLimit(`bot:${clientIP}`, {
        windowMs: 3600000, maxRequests: 3, violationThreshold: 1, blockDurationMs: 7200000
      });
      if (!botLimit.allowed) {
        return new Response(
          JSON.stringify({ success: false, error: 'Suspicious activity detected. Access temporarily restricted.' }),
          { status: 403, headers: { ...combinedHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // **SECURITY**: Define allowed redirect domains
    const allowedDomains = [
      'localhost',
      '127.0.0.1',
      new URL(siteUrl).hostname, // Extract hostname from SITE_URL
      ...(Deno.env.get('ALLOWED_REDIRECT_DOMAINS')?.split(',').map(d => d.trim()).filter(d => d) || [])
    ];
    
    // **SECURITY**: Validate and construct secure redirect URL
    let validatedRedirectUrl: string;
    
    if (p_redirect_url) {
      // Validate URL length to prevent DoS attacks
      if (p_redirect_url.length > 2048) {
        console.error('🚨 SECURITY: Redirect URL too long, using default');
        validatedRedirectUrl = `${siteUrl}/?invitation=true&team=${encodeURIComponent(p_team_id)}&role=${encodeURIComponent(p_role)}`;
      } else if (validateRedirectUrl(p_redirect_url, allowedDomains)) {
        validatedRedirectUrl = p_redirect_url;
        console.log('✅ SECURITY: Validated custom redirect URL');
      } else {
        console.warn('🚨 SECURITY: Blocked unauthorized redirect, using safe default');
        // Fall back to safe default URL
        validatedRedirectUrl = `${siteUrl}/?invitation=true&team=${encodeURIComponent(p_team_id)}&role=${encodeURIComponent(p_role)}`;
      }
    } else {
      // Use default safe redirect URL
      validatedRedirectUrl = `${siteUrl}/?invitation=true&team=${encodeURIComponent(p_team_id)}&role=${encodeURIComponent(p_role)}`;
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
      p_message: sanitizedMessage,
      p_redirect_url: validatedRedirectUrl
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
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
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
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
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
          redirectTo: validatedRedirectUrl,
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
            headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
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

      // **SECURITY**: Log successful invitation for monitoring
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'successful_invite',
        severity: 'info',
        client_ip: clientIP,
        user_agent: userAgent,
        details: {
          invitation_id: dbResult.invitation_id,
          team_name: dbResult.team_name,
          role: p_role,
          email_sent: true
        },
        correlation_id: correlationId
      });

      console.log('🎉 Complete success - returning response');
      return new Response(
        JSON.stringify(successResponse),
        { 
          status: 200, 
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
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
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
