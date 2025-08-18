const MAX_NAME_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 500;
const MAX_EMAIL_LENGTH = 320; // RFC 5321 limit
const ALLOWED_NAME_PATTERN = /^[a-zA-ZÀ-ÿ0-9\s\-'&.]*$/;
const ALLOWED_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Note: Dangerous character filtering is handled inline within each sanitization function
const SQL_INJECTION_PATTERNS = /(--|\/\*|\*\/|xp_|sp_|0x|\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\btable\b|\balter\b|\bexec\b|\bexecute\b)/gi;

export const sanitizeNameInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Limit length first to prevent buffer overflow attacks
  if (input.length > MAX_NAME_LENGTH) {
    input = input.substring(0, MAX_NAME_LENGTH);
  }
  
  // Remove characters not allowed in names (this already handles most dangerous chars)
  if (!ALLOWED_NAME_PATTERN.test(input)) {
    input = input.replace(/[^a-zA-ZÀ-ÿ0-9\s\-'&.]/g, '');
  }
  
  // Additional XSS protection - remove specific dangerous patterns while preserving allowed chars
  input = input.replace(/<script[^>]*>.*?<\/script>/gi, ''); // Remove script tags
  input = input.replace(/<[^>]*>/g, ''); // Remove any remaining HTML tags
  input = input.replace(/javascript:/gi, ''); // Remove javascript: urls
  input = input.replace(/on\w+\s*=/gi, ''); // Remove event handlers
  
  // Remove potential SQL injection patterns while preserving valid text
  input = input.replace(SQL_INJECTION_PATTERNS, '');
  
  return input;
};

export const isValidNameInput = (input) => {
  if (typeof input !== 'string') {
    return false;
  }
  
  const trimmed = input.trim();
  
  // Check length limits (allow empty strings as before)
  if (trimmed.length > MAX_NAME_LENGTH) {
    return false;
  }
  
  // Check against allowed pattern
  if (!ALLOWED_NAME_PATTERN.test(trimmed)) {
    return false;
  }
  
  // Check for specific dangerous patterns
  if (/<script/gi.test(trimmed) || /javascript:/gi.test(trimmed) || /on\w+\s*=/gi.test(trimmed)) {
    return false;
  }
  
  // Check for SQL injection patterns
  if (SQL_INJECTION_PATTERNS.test(trimmed)) {
    return false;
  }
  
  return true;
};

// Enhanced email sanitization
export const sanitizeEmailInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Limit length first
  if (input.length > MAX_EMAIL_LENGTH) {
    input = input.substring(0, MAX_EMAIL_LENGTH);
  }
  
  // Remove specific dangerous patterns while preserving email format
  input = input.replace(/<script[^>]*>.*?<\/script>/gi, ''); // Remove script tags
  input = input.replace(/<[^>]*>/g, ''); // Remove HTML tags
  input = input.replace(/javascript:/gi, ''); // Remove javascript: urls
  input = input.replace(/on\w+\s*=/gi, ''); // Remove event handlers
  
  // Remove SQL injection patterns
  input = input.replace(SQL_INJECTION_PATTERNS, '');
  
  return input.toLowerCase().trim();
};

export const isValidEmailInput = (input) => {
  if (typeof input !== 'string') {
    return false;
  }
  
  const trimmed = input.trim().toLowerCase();
  
  // Check length limits
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) {
    return false;
  }
  
  // Check email format
  if (!ALLOWED_EMAIL_PATTERN.test(trimmed)) {
    return false;
  }
  
  // Check for specific dangerous patterns
  if (/<script/gi.test(trimmed) || /javascript:/gi.test(trimmed) || /on\w+\s*=/gi.test(trimmed)) {
    return false;
  }
  
  // Check for SQL injection patterns
  if (SQL_INJECTION_PATTERNS.test(trimmed)) {
    return false;
  }
  
  return true;
};

// Message/text content sanitization
export const sanitizeMessageInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Allow more characters in messages but still prevent XSS
  let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gi, ''); // Remove script tags
  sanitized = sanitized.replace(/<[^>]*>/g, ''); // Remove HTML tags
  sanitized = sanitized.replace(/javascript:/gi, ''); // Remove javascript: urls
  sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Remove event handlers
  
  // Limit length
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
  }
  
  // Remove SQL injection patterns
  sanitized = sanitized.replace(SQL_INJECTION_PATTERNS, '');
  
  return sanitized;
};

export const isValidMessageInput = (input) => {
  if (typeof input !== 'string') {
    return false;
  }
  
  // Check length limits (messages can be empty)
  if (input.length > MAX_MESSAGE_LENGTH) {
    return false;
  }
  
  // Check for dangerous patterns
  if (/<script/gi.test(input) || /javascript:/gi.test(input) || /on\w+\s*=/gi.test(input)) {
    return false;
  }
  
  // Check for SQL injection patterns
  if (SQL_INJECTION_PATTERNS.test(input)) {
    return false;
  }
  
  return true;
};

// General purpose sanitizer for search terms
export const sanitizeSearchInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove dangerous characters that could break SQL queries
  let sanitized = input.replace(/[%_\\'"`;]/g, ''); // Remove SQL wildcards and injection chars
  
  // Remove specific dangerous patterns
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, ''); // Remove script tags
  sanitized = sanitized.replace(/<[^>]*>/g, ''); // Remove HTML tags
  sanitized = sanitized.replace(/javascript:/gi, ''); // Remove javascript: urls
  sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Remove event handlers
  
  // Remove SQL injection patterns
  sanitized = sanitized.replace(SQL_INJECTION_PATTERNS, '');
  
  // Limit length
  sanitized = sanitized.substring(0, 100);
  
  return sanitized.trim().toLowerCase();
};