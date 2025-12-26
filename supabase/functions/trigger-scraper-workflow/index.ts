import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  checkRateLimitRedis,
  createRedisClient,
  type RateLimitConfig,
  MS_IN_HOUR,
} from '../_shared/redisRateLimit.ts'
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

export interface WorkflowTriggerRequest {
  team_id: string;
}

export interface WorkflowTriggerResponse {
  success: boolean;
  message: string;
}

console.log('🚀 Trigger Scraper Workflow Edge Function starting...');

// GitHub configuration
const GITHUB_OWNER = 'beggan78';
const GITHUB_REPO = 'sportadmin-scraper';
const GITHUB_WORKFLOW_FILE = 'scraper.yml';
const VAULT_GITHUB_TOKEN_NAME = 'github_workflow_token';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Time helpers to avoid magic numbers
const ONE_HOUR_MS = MS_IN_HOUR;

const RATE_LIMIT_CONFIGS: { perTeam: RateLimitConfig } = {
  perTeam: {
    windowMs: ONE_HOUR_MS,
    maxRequests: 5,
    violationThreshold: Number.MAX_SAFE_INTEGER,
    blockDurationMs: 0
  }
};

const redis = createRedisClient('trigger-scraper-workflow');

/**
 * Validates that a string is a valid UUID format
 */
function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Creates a standardized error response
 */
function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...combinedHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Creates a standardized success response
 */
function successResponse(data: WorkflowTriggerResponse): Response {
  return new Response(
    JSON.stringify(data),
    { status: 200, headers: { ...combinedHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Main handler for the trigger-scraper-workflow Edge Function
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Parse and validate request
    const { team_id } = await req.json() as WorkflowTriggerRequest;

    if (!team_id) {
      console.error('Missing team_id in request');
      return errorResponse('team_id is required', 400);
    }

    if (!isValidUUID(team_id)) {
      console.error('Invalid team_id format:', team_id);
      return errorResponse('team_id must be a valid UUID', 400);
    }

    // 2. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return errorResponse('Unauthorized', 401);
    }

    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return errorResponse('Unauthorized', 401);
    }

    console.log(`User ${user.id} requesting workflow trigger for team ${team_id}`);

    // 3. Verify team access
    const { data: teamAccess, error: teamError } = await supabase
      .from('team_user')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamAccess) {
      console.error('Team access denied:', teamError?.message);
      return errorResponse('Access denied to team', 403);
    }

    console.log(`User has ${teamAccess.role} role on team ${team_id}`);

    // **SECURITY**: Per-team rate limiting to protect GitHub API quota (Redis-backed)
    const teamLimit = await checkRateLimitRedis(
      redis,
      team_id,
      RATE_LIMIT_CONFIGS.perTeam,
      'team',
      'trigger-scraper-workflow'
    );

    if (!teamLimit.allowed) {
      console.warn(`🚨 SECURITY: Team rate limit exceeded - ${team_id}`);
      return new Response(
        JSON.stringify({ error: teamLimit.message || 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            ...combinedHeaders,
            'Content-Type': 'application/json',
            ...teamLimit.headers
          }
        }
      );
    }

    // 4. Get GitHub token from Vault
    const supabaseAdmin = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: githubToken, error: vaultError } = await supabaseAdmin
      .rpc('get_vault_secret_by_name', {
        secret_name: VAULT_GITHUB_TOKEN_NAME
      });

    if (vaultError) {
      console.error('Vault access error:', vaultError?.message);
      return errorResponse('Failed to retrieve workflow credentials', 500);
    }

    if (!githubToken || typeof githubToken !== 'string') {
      console.error('GitHub token is empty or invalid in Vault');
      return errorResponse('Invalid workflow credentials configuration', 500);
    }

    console.log('Successfully retrieved GitHub token from Vault (length:', githubToken.length, ')');

    // 5. Trigger GitHub workflow
    const workflowUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW_FILE}/dispatches`;

    console.log(`Triggering workflow: ${workflowUrl}`);
    console.log(`Workflow inputs: team_id=${team_id}, max_jobs=10`);

    const githubResponse = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'SportWizard-Connector-Service'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          team_id: team_id,
          max_jobs: '10'
        }
      })
    });

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      console.error('GitHub API error:', githubResponse.status, githubResponse.statusText);
      console.error('GitHub API response:', errorText);

      // Return different messages based on status code
      if (githubResponse.status === 401) {
        return errorResponse('GitHub authentication failed - token may be expired', 500);
      } else if (githubResponse.status === 404) {
        return errorResponse('GitHub workflow not found', 500);
      } else if (githubResponse.status === 422) {
        return errorResponse('Invalid workflow inputs', 500);
      }

      return errorResponse('Failed to trigger workflow', 500);
    }

    console.log('✅ GitHub workflow triggered successfully');

    // 6. Success response
    return successResponse({
      success: true,
      message: 'Scraper workflow triggered successfully'
    });

  } catch (error) {
    console.error('Unexpected error in trigger-scraper-workflow:', error);
    return errorResponse('Internal server error', 500);
  }
});
