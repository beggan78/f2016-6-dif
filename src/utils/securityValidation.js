/**
 * Security Validation Framework
 * 
 * Comprehensive validation utilities for preventing common security vulnerabilities
 * including SQL injection, XSS, CSRF, and input validation attacks.
 */

import { 
  sanitizeNameInput, 
  sanitizeEmailInput, 
  sanitizeMessageInput,
  sanitizeSearchInput,
  isValidNameInput, 
  isValidEmailInput, 
  isValidMessageInput 
} from './inputSanitization';

// Rate limiting configuration
const RATE_LIMITS = {
  search: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  invitation: { maxRequests: 5, windowMs: 300000 }, // 5 invitations per 5 minutes
  teamCreation: { maxRequests: 3, windowMs: 3600000 }, // 3 teams per hour
  playerCreation: { maxRequests: 20, windowMs: 3600000 } // 20 players per hour
};

// In-memory rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map();

/**
 * Rate limiting utility
 * @param {string} key - Unique identifier for the rate limit (e.g., user ID + action)
 * @param {Object} config - Rate limit configuration
 * @returns {boolean} True if request is allowed, false if rate limited
 */
export const checkRateLimit = (key, config) => {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }
  
  const requests = rateLimitStore.get(key);
  
  // Remove expired requests
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (validRequests.length >= config.maxRequests) {
    return false; // Rate limited
  }
  
  // Add current request
  validRequests.push(now);
  rateLimitStore.set(key, validRequests);
  
  return true; // Request allowed
};

/**
 * Comprehensive form validation for team creation
 * @param {Object} teamData - Team creation data
 * @returns {Object} Validation result with success flag and errors
 */
export const validateTeamCreation = (teamData) => {
  const errors = {};
  
  // Validate team name
  if (!teamData.name || !isValidNameInput(teamData.name)) {
    errors.name = 'Team name is required and must contain only valid characters';
  }
  
  // Validate club selection
  if (!teamData.clubId || typeof teamData.clubId !== 'string') {
    errors.clubId = 'Valid club selection is required';
  }
  
  // Validate configuration if provided
  if (teamData.configuration && typeof teamData.configuration !== 'object') {
    errors.configuration = 'Team configuration must be a valid object';
  }
  
  return {
    success: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      name: sanitizeNameInput(teamData.name || ''),
      clubId: teamData.clubId,
      configuration: teamData.configuration || {}
    }
  };
};

/**
 * Comprehensive form validation for player creation
 * @param {Object} playerData - Player creation data
 * @returns {Object} Validation result with success flag and errors
 */
export const validatePlayerCreation = (playerData = {}) => {
  const errors = {};
  const rawFirstName = playerData.firstName ?? playerData.first_name ?? '';
  const rawLastName = playerData.lastName ?? playerData.last_name ?? '';
  const rawDisplayName = playerData.displayName ?? playerData.display_name ?? '';
  const firstName = rawFirstName.trim();
  const lastName = rawLastName.trim();
  const displayName = rawDisplayName.trim();
  
  // Validate required name fields
  if (!firstName || !isValidNameInput(firstName)) {
    errors.firstName = 'First name is required and must contain only valid characters';
  }

  if (!displayName || !isValidNameInput(displayName)) {
    errors.displayName = 'Display name is required and must contain only valid characters';
  }

  if (lastName && !isValidNameInput(lastName)) {
    errors.lastName = 'Last name must contain only valid characters';
  }
  
  // Validate jersey number if provided
  if (playerData.jerseyNumber !== null && playerData.jerseyNumber !== undefined) {
    const jerseyNum = parseInt(playerData.jerseyNumber);
    if (isNaN(jerseyNum) || jerseyNum < 1 || jerseyNum > 999) {
      errors.jerseyNumber = 'Jersey number must be between 1 and 999';
    }
  }
  
  return {
    success: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      firstName: sanitizeNameInput(firstName),
      lastName: lastName ? sanitizeNameInput(lastName) : null,
      displayName: sanitizeNameInput(displayName),
      jerseyNumber: playerData.jerseyNumber ? parseInt(playerData.jerseyNumber) : null
    }
  };
};

/**
 * Comprehensive form validation for team invitations
 * @param {Object} invitationData - Invitation data
 * @returns {Object} Validation result with success flag and errors
 */
export const validateTeamInvitation = (invitationData) => {
  const errors = {};
  
  // Validate email
  if (!invitationData.email || !isValidEmailInput(invitationData.email)) {
    errors.email = 'Valid email address is required';
  }
  
  // Validate role
  const validRoles = ['admin', 'coach', 'parent', 'player'];
  if (!invitationData.role || !validRoles.includes(invitationData.role)) {
    errors.role = 'Valid role selection is required';
  }
  
  // Validate message if provided
  if (invitationData.message && !isValidMessageInput(invitationData.message)) {
    errors.message = 'Message contains invalid characters or is too long';
  }
  
  // Validate team ID
  if (!invitationData.teamId || typeof invitationData.teamId !== 'string') {
    errors.teamId = 'Valid team ID is required';
  }
  
  return {
    success: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      email: sanitizeEmailInput(invitationData.email || ''),
      role: invitationData.role,
      message: sanitizeMessageInput(invitationData.message || ''),
      teamId: invitationData.teamId
    }
  };
};

/**
 * Comprehensive form validation for club creation
 * @param {Object} clubData - Club creation data
 * @returns {Object} Validation result with success flag and errors
 */
export const validateClubCreation = (clubData) => {
  const errors = {};
  
  // Validate club name
  if (!clubData.name || !isValidNameInput(clubData.name)) {
    errors.name = 'Club name is required and must contain only valid characters';
  }
  
  // Validate short name if provided
  if (clubData.shortName && !isValidNameInput(clubData.shortName)) {
    errors.shortName = 'Short name must contain only valid characters';
  }
  
  // Validate long name if provided
  if (clubData.longName && !isValidNameInput(clubData.longName)) {
    errors.longName = 'Long name must contain only valid characters';
  }
  
  return {
    success: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      name: sanitizeNameInput(clubData.name || ''),
      shortName: clubData.shortName ? sanitizeNameInput(clubData.shortName) : null,
      longName: clubData.longName ? sanitizeNameInput(clubData.longName) : null
    }
  };
};

/**
 * Validation for search queries
 * @param {string} query - Search query
 * @returns {Object} Validation result
 */
export const validateSearchQuery = (query) => {
  const sanitizedQuery = sanitizeSearchInput(query);
  
  return {
    success: sanitizedQuery.length >= 2 && sanitizedQuery.length <= 100,
    errors: sanitizedQuery.length < 2 
      ? { query: 'Search query must be at least 2 characters' }
      : sanitizedQuery.length > 100 
        ? { query: 'Search query is too long' }
        : {},
    sanitizedData: {
      query: sanitizedQuery
    }
  };
};

/**
 * Security headers for HTTP requests
 * @returns {Object} Security headers
 */
export const getSecurityHeaders = () => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;"
  };
};

/**
 * CSRF token generation (simple implementation)
 * In production, use a proper CSRF library
 * @returns {string} CSRF token
 */
export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * CSRF token validation
 * @param {string} token - Token to validate
 * @param {string} storedToken - Stored token to compare against
 * @returns {boolean} True if tokens match
 */
export const validateCSRFToken = (token, storedToken) => {
  if (!token || !storedToken) return false;
  return token === storedToken;
};

/**
 * Input sanitization for profile data
 * @param {Object} profileData - User profile data
 * @returns {Object} Sanitized profile data
 */
export const sanitizeProfileData = (profileData) => {
  return {
    name: sanitizeNameInput(profileData.name || ''),
    // Add more profile fields as needed
  };
};

/**
 * Check if request appears to be from a bot or automated tool
 * @param {Object} headers - Request headers
 * @returns {boolean} True if request appears to be from a bot
 */
export const detectBot = (headers) => {
  const userAgent = headers['user-agent'] || '';
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /node/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
};

export { RATE_LIMITS };
