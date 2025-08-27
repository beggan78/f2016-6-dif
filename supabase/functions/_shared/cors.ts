// Get allowed origin based on environment
const getAllowedOrigin = (): string => {
  // Check for explicit allowed origins secret first
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (allowedOrigins) {
    return allowedOrigins;
  }
  
  // Fallback: In production (when DENO_DEPLOYMENT_ID exists), restrict to specific domain
  // In development, allow all origins for localhost testing
  return Deno.env.get('DENO_DEPLOYMENT_ID') 
    ? 'https://sportwizard.se'  // Production fallback
    : '*';                      // Development: allow all origins
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export const securityHeaders = corsHeaders; // Backward compatibility