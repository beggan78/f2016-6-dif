import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import type { Database } from '../../../src/types/supabase.ts'

// **SECURITY**: Enhanced security headers to prevent common attacks combined with CORS
export const combinedHeaders = {
  ...corsHeaders,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';"
};

export interface ConnectProviderRequest {
  team_id: string;
  provider: string;
  username: string;
  password: string;
}

export interface EncryptedCredentials {
  encryptedUsername: Uint8Array;
  encryptedPassword: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
}

console.log('🚀 Connect Provider Edge Function starting...');

// **SECURITY**: Master encryption key name in Supabase Vault
export const VAULT_KEY_NAME = 'connector_master_key';

// **ENCRYPTION**: PBKDF2 iteration count for key derivation (matches scraper)
export const PBKDF2_ITERATIONS = 310000;

// Time helpers to avoid magic numbers
export const MS_IN_SECOND = 1000;
export const MS_IN_MINUTE = 60 * MS_IN_SECOND;
export const MS_IN_HOUR = 60 * MS_IN_MINUTE;
export const TEN_MINUTES_MS = 10 * MS_IN_MINUTE;
export const THIRTY_MINUTES_MS = 30 * MS_IN_MINUTE;
export const ONE_HOUR_MS = MS_IN_HOUR;
export const TWO_HOURS_MS = 2 * MS_IN_HOUR;

export const TEN_MINUTES_SECONDS = 10 * 60;
export const THIRTY_MINUTES_SECONDS = 30 * 60;
export const ONE_HOUR_SECONDS = 60 * 60;

export const MAX_RATE_LIMIT_DELAY_MS = 30 * MS_IN_SECOND;
export const BASE_RATE_LIMIT_DELAY_MS = MS_IN_SECOND;

// **SECURITY**: Advanced rate limiting system with multiple tiers
export interface RateLimitEntry {
  count: number;
  lastReset: number;
  blocked: boolean;
  violations: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  violationThreshold: number;
  blockDurationMs: number;
}

export const RATE_LIMIT_CONFIGS = {
  perIP: { windowMs: ONE_HOUR_MS, maxRequests: 10, violationThreshold: 3, blockDurationMs: ONE_HOUR_MS }, // 1 hour
  perUser: { windowMs: ONE_HOUR_MS, maxRequests: 50, violationThreshold: 2, blockDurationMs: THIRTY_MINUTES_MS }, // 30 min
  global: { windowMs: ONE_HOUR_MS, maxRequests: 100, violationThreshold: 1, blockDurationMs: TEN_MINUTES_MS } // 10 min
};

// In-memory rate limiting store (would use Redis in production)
// NOTE: Supabase Edge Functions reset memory on cold start, so these limits reset per instance.
// Documented limitation: attackers could bypass limits by waiting for the function to cold start.
const rateLimitStore = new Map<string, RateLimitEntry>();

// **SECURITY**: Cleanup old rate limit entries
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries older than 2 hours
    if (now - entry.lastReset > TWO_HOURS_MS) {
      rateLimitStore.delete(key);
    }
  }
}

// **SECURITY**: Check rate limit with escalating response
export function checkRateLimit(identifier: string, config: RateLimitConfig): { allowed: boolean; delay?: number; message?: string } {
  const now = Date.now();
  const key = `${identifier}`;
  const entry = rateLimitStore.get(key) || { count: 0, lastReset: now, blocked: false, violations: 0 };

  // Check if currently blocked
  if (entry.blocked && now - entry.lastReset < config.blockDurationMs) {
    const remainingMs = config.blockDurationMs - (now - entry.lastReset);
    return {
      allowed: false,
      message: `Rate limit exceeded. Try again in ${Math.ceil(remainingMs / MS_IN_MINUTE)} minutes.`
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
      console.warn(`🚨 SECURITY: Rate limit violation - blocking ${identifier} for ${config.blockDurationMs / MS_IN_MINUTE} minutes`);
    }

    // Calculate exponential backoff delay
    const delay = Math.min(BASE_RATE_LIMIT_DELAY_MS * Math.pow(2, entry.violations), MAX_RATE_LIMIT_DELAY_MS); // Max 30 seconds

    rateLimitStore.set(key, entry);
    return {
      allowed: false,
      delay,
      message: `Rate limit exceeded. Please wait ${delay / MS_IN_SECOND} seconds before retrying.`
    };
  }

  rateLimitStore.set(key, entry);
  return { allowed: true };
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

// **SECURITY**: Enhanced IP extraction with validation
export function extractClientIP(req: Request): string {
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
      if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip) || /^[0-9a-fA-F:]+$/.test(ip)) {
        return ip;
      }
    }
  }

  return 'unknown';
}

// **SECURITY**: Advanced bot detection with scoring
export function calculateBotScore(userAgent: string, req: Request): number {
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
export interface SecurityEvent {
  timestamp: string;
  event_type: 'rate_limit_exceeded' | 'bot_detected' | 'validation_failed' | 'unauthorized_access' | 'encryption_error' | 'successful_connection';
  severity: 'info' | 'warn' | 'error' | 'critical';
  client_ip: string;
  user_agent: string;
  user_id?: string;
  details: Record<string, unknown>;
  correlation_id: string;
}

export function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    ...event,
    service: 'connect-provider',
    version: '1.0.0'
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

export function generateCorrelationId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// **SECURITY**: Input validation functions
export function validateTeamId(teamId: string): { valid: boolean; error?: string } {
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

export function validateProvider(provider: string): { valid: boolean; error?: string } {
  if (!provider || typeof provider !== 'string') {
    return { valid: false, error: 'Provider is required' };
  }

  const validProviders = ['sportadmin', 'svenska_lag'];
  if (!validProviders.includes(provider)) {
    return { valid: false, error: 'Invalid provider specified' };
  }

  return { valid: true };
}

export function validateCredentials(username: string, password: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length > 100) {
    return { valid: false, error: 'Username must be 100 characters or less' };
  }

  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length > 200) {
    return { valid: false, error: 'Password must be 200 characters or less' };
  }

  return { valid: true };
}

// **ENCRYPTION**: Retrieve master key from Vault
export async function getMasterKeyFromVault(supabaseAdmin: SupabaseClient<Database>): Promise<string> {
  console.log(`🔐 Retrieving master key from Vault (name: ${VAULT_KEY_NAME})...`);

  const { data, error } = await supabaseAdmin
    .rpc('get_vault_secret_by_name', {
      secret_name: VAULT_KEY_NAME
    });

  if (error) {
    console.error('❌ Failed to retrieve master key from Vault:', error);
    throw new Error('Failed to retrieve encryption key from Vault');
  }

  if (!data) {
    console.error('❌ Master key not found in Vault');
    throw new Error('Encryption key not found in Vault');
  }

  console.log('✅ Master key retrieved successfully');
  return data; // RPC returns the string directly
}

// **HELPER**: Convert Uint8Array to hex string for PostgreSQL bytea
export function uint8ArrayToHex(uint8Array: Uint8Array): string {
  return '\\x' + Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// **HELPER**: Decode base64 (or base64url) string to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('Master key must be a non-empty string');
  }

  // Debug logging - show type and first 20 chars (for security)
  console.log(`🔍 Decoding master key: type=${typeof base64}, length=${base64.length}, preview="${base64.substring(0, 20)}..."`);

  // Strip surrounding quotes (single or double) that Vault might add
  let cleaned = base64.trim().replace(/^["']|["']$/g, '');

  // Remove any whitespace and normalize base64url -> base64 (Deno's atob is stricter than Node)
  const sanitized = cleaned.replace(/\s+/g, '');
  let normalized = sanitized.replace(/-/g, '+').replace(/_/g, '/');

  // Pad base64 string to proper length
  const paddingNeeded = normalized.length % 4;
  if (paddingNeeded) {
    normalized += '='.repeat(4 - paddingNeeded);
  }

  let binaryString: string;
  try {
    binaryString = atob(normalized);
  } catch (error) {
    console.error('❌ Failed to decode master key from base64:', error);
    console.error(`   Original value preview: "${base64.substring(0, 50)}..."`);
    console.error(`   After cleaning: "${cleaned.substring(0, 50)}..."`);
    throw new Error('Invalid base64-encoded master key supplied');
  }

  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// **ENCRYPTION**: Encrypt credentials using AES-256-GCM
export async function encryptCredentials(
  username: string,
  password: string,
  masterKey: string
): Promise<EncryptedCredentials> {
  console.log('🔐 Encrypting credentials...');

  try {
    // Generate random IV and salt
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM
    const salt = crypto.getRandomValues(new Uint8Array(16)); // 16 bytes salt

    console.log('✅ Generated IV and salt');

    // Decode base64 master key to bytes (matches scraper's approach)
    const masterKeyBytes = base64ToUint8Array(masterKey);
    console.log(`🔑 Master key decoded: ${masterKeyBytes.length} bytes`);

    // Validate key length (AES-256 requires 32 bytes)
    if (masterKeyBytes.length !== 32) {
      console.error(`❌ Master key decoded to unexpected length: ${masterKeyBytes.length} bytes (expected 32)`);
      throw new Error('Invalid master key length. Expected 32 bytes.');
    }

    // Import master key as raw key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      masterKeyBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive encryption key using PBKDF2
    const encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    console.log('✅ Derived encryption key');

    // Encrypt username
    const encryptedUsername = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        encryptionKey,
        new TextEncoder().encode(username)
      )
    );

    // Encrypt password
    const encryptedPassword = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        encryptionKey,
        new TextEncoder().encode(password)
      )
    );

    console.log('✅ Credentials encrypted successfully');

    return {
      encryptedUsername,
      encryptedPassword,
      iv,
      salt
    };
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    throw new Error('Failed to encrypt credentials');
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
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

    console.log('🔍 Checking environment variables...');
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

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
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase clients initialized');

    // Parse request body
    let requestBody: ConnectProviderRequest;
    try {
      requestBody = await req.json();
      console.log('📋 Request parsed:', {
        team_id: requestBody.team_id,
        provider: requestBody.provider,
        has_username: !!requestBody.username,
        has_password: !!requestBody.password
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

    const { team_id, provider, username, password } = requestBody;

    // Validate required parameters
    if (!team_id || !provider || !username || !password) {
      console.error('❌ Missing required parameters');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters: team_id, provider, username, and password are required'
        }),
        {
          status: 400,
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // **SECURITY**: Advanced input validation and sanitization
    console.log('🔍 SECURITY: Validating input parameters...');

    // Validate team ID format
    const teamIdValidation = validateTeamId(team_id);
    if (!teamIdValidation.valid) {
      console.error(`❌ SECURITY: Team ID validation failed - ${teamIdValidation.error}`);
      return new Response(
        JSON.stringify({ success: false, error: teamIdValidation.error }),
        { status: 400, headers: { ...combinedHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate provider
    const providerValidation = validateProvider(provider);
    if (!providerValidation.valid) {
      console.error(`❌ SECURITY: Provider validation failed - ${providerValidation.error}`);
      return new Response(
        JSON.stringify({ success: false, error: providerValidation.error }),
        { status: 400, headers: { ...combinedHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate credentials
    const credentialsValidation = validateCredentials(username, password);
    if (!credentialsValidation.valid) {
      console.error(`❌ SECURITY: Credentials validation failed - ${credentialsValidation.error}`);
      return new Response(
        JSON.stringify({ success: false, error: credentialsValidation.error }),
        { status: 400, headers: { ...combinedHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          retryAfter: ipLimit.delay ? Math.ceil(ipLimit.delay / MS_IN_SECOND) : undefined
        }),
        {
          status: 429,
          headers: {
            ...combinedHeaders,
            'Content-Type': 'application/json',
            'Retry-After': ipLimit.delay
              ? String(Math.ceil(ipLimit.delay / MS_IN_SECOND))
              : String(ONE_HOUR_SECONDS)
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
          retryAfter: TEN_MINUTES_SECONDS // 10 minutes
        }),
        {
          status: 503,
          headers: {
            ...combinedHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(TEN_MINUTES_SECONDS)
          }
        }
      );
    }

    // User-based rate limiting (after authentication)
    const authUser = await supabase.auth.getUser();
    if (authUser.data.user) {
      const userRateLimit = checkRateLimit(`user:${authUser.data.user.id}`, RATE_LIMIT_CONFIGS.perUser);
      if (!userRateLimit.allowed) {
        console.warn(`🚨 SECURITY: User rate limit exceeded - ${authUser.data.user.id}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: userRateLimit.message,
            retryAfter: userRateLimit.delay ? Math.ceil(userRateLimit.delay / MS_IN_SECOND) : undefined
          }),
          {
            status: 429,
            headers: {
              ...combinedHeaders,
              'Content-Type': 'application/json',
              'Retry-After': userRateLimit.delay
                ? String(Math.ceil(userRateLimit.delay / MS_IN_SECOND))
                : String(THIRTY_MINUTES_SECONDS)
            }
          }
        );
      }
    }

    // **SECURITY**: Generate correlation ID for tracking
    const correlationId = generateCorrelationId();

    console.log(`🔍 SECURITY: Request from IP: ${clientIP}, UA: ${userAgent.substring(0, 100)}, Correlation: ${correlationId}`);

    // **SECURITY**: Enhanced bot detection with scoring system
    const botScore = calculateBotScore(userAgent, req);
    if (botScore > 0.7) {
      console.warn(`🚨 SECURITY: High bot probability detected - Score: ${botScore}, IP: ${clientIP}, UA: ${userAgent}`);
      // For high bot scores, apply stricter rate limiting
      const botLimit = checkRateLimit(`bot:${clientIP}`, {
        windowMs: ONE_HOUR_MS,
        maxRequests: 3,
        violationThreshold: 1,
        blockDurationMs: TWO_HOURS_MS
      });
      if (!botLimit.allowed) {
        return new Response(
          JSON.stringify({ success: false, error: 'Suspicious activity detected. Access temporarily restricted.' }),
          { status: 403, headers: { ...combinedHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // **AUTHORIZATION**: Verify user has access to team
    console.log('🎯 Step 1: Verifying user has access to team...');

    const { data: teamAccess, error: teamError } = await supabase
      .from('team_user')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', authUser.data.user?.id)
      .single();

    if (teamError || !teamAccess) {
      console.error('❌ User does not have access to team:', teamError);

      logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'unauthorized_access',
        severity: 'warn',
        client_ip: clientIP,
        user_agent: userAgent,
        user_id: authUser.data.user?.id,
        details: { team_id, attempted_provider: provider },
        correlation_id: correlationId
      });

      return new Response(
        JSON.stringify({ success: false, error: 'You do not have access to this team' }),
        {
          status: 403,
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ User has access to team with role:', teamAccess.role);

    // **ENCRYPTION**: Step 2: Retrieve master key from Vault
    console.log('🎯 Step 2: Retrieving master key from Vault...');

    let masterKey: string;
    try {
      masterKey = await getMasterKeyFromVault(supabaseAdmin);
    } catch (vaultError) {
      console.error('❌ Failed to retrieve master key:', vaultError);

      logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'encryption_error',
        severity: 'critical',
        client_ip: clientIP,
        user_agent: userAgent,
        user_id: authUser.data.user?.id,
        details: { error: 'vault_key_retrieval_failed', team_id },
        correlation_id: correlationId
      });

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to initialize encryption system' }),
        {
          status: 500,
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // **ENCRYPTION**: Step 3: Encrypt credentials
    console.log('🎯 Step 3: Encrypting credentials...');

    let encrypted: EncryptedCredentials;
    try {
      encrypted = await encryptCredentials(username, password, masterKey);
    } catch (encryptError) {
      console.error('❌ Failed to encrypt credentials:', encryptError);

      logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'encryption_error',
        severity: 'error',
        client_ip: clientIP,
        user_agent: userAgent,
        user_id: authUser.data.user?.id,
        details: { error: 'credential_encryption_failed', team_id },
        correlation_id: correlationId
      });

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to encrypt credentials' }),
        {
          status: 500,
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // **DATABASE**: Step 4: Store encrypted credentials (upsert)
    console.log('🎯 Step 4: Storing encrypted credentials in database...');

    const { data: connectorData, error: connectorError } = await supabaseAdmin
      .from('connector')
      .upsert({
        team_id,
        provider,
        status: 'verifying',
        encrypted_username: uint8ArrayToHex(encrypted.encryptedUsername),
        encrypted_password: uint8ArrayToHex(encrypted.encryptedPassword),
        encryption_iv: uint8ArrayToHex(encrypted.iv),
        encryption_salt: uint8ArrayToHex(encrypted.salt),
        encryption_key_version: 1,
        created_by: authUser.data.user?.id,
        last_updated_by: authUser.data.user?.id,
        last_error: null
      }, {
        onConflict: 'team_id,provider',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (connectorError) {
      console.error('❌ Failed to store connector:', connectorError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${connectorError.message}`
        }),
        {
          status: 500,
          headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Connector stored successfully:', connectorData.id);

    // **DATABASE**: Step 5: Create verification sync job
    console.log('🎯 Step 5: Creating verification sync job...');

    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('connector_sync_job')
      .insert({
        connector_id: connectorData.id,
        job_type: 'verification',
        status: 'waiting',
        scheduled_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (jobError) {
      console.error('❌ Failed to create sync job:', jobError);
      // This is not critical - connector is stored, job can be created manually
      console.warn('⚠️ Connector created but sync job failed - continuing');
    } else {
      console.log('✅ Verification sync job created:', jobData.id);
    }

    // **SECURITY**: Log successful connection
    logSecurityEvent({
      timestamp: new Date().toISOString(),
      event_type: 'successful_connection',
      severity: 'info',
      client_ip: clientIP,
      user_agent: userAgent,
      user_id: authUser.data.user?.id,
      details: {
        connector_id: connectorData.id,
        team_id,
        provider,
        sync_job_id: jobData?.id
      },
      correlation_id: correlationId
    });

    // Step 6: Return success response
    const successResponse = {
      success: true,
      data: {
        connector_id: connectorData.id,
        team_id,
        provider,
        status: 'verifying',
        sync_job_id: jobData?.id
      },
      message: `${provider} connected successfully! Verification in progress...`
    };

    console.log('🎉 Complete success - returning response');
    return new Response(
      JSON.stringify(successResponse),
      {
        status: 200,
        headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...combinedHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
}
