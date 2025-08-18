/**
 * CSRF Protection Hook
 * 
 * Provides CSRF token generation and validation for protecting against
 * Cross-Site Request Forgery attacks on state-changing operations.
 */

import { useState, useEffect, useCallback } from 'react';
import { generateCSRFToken, validateCSRFToken } from '../utils/securityValidation';

const CSRF_TOKEN_KEY = 'sport_wizard_csrf_token';

export const useCSRFProtection = () => {
  const [csrfToken, setCsrfToken] = useState(null);

  // Generate CSRF token on mount
  useEffect(() => {
    const generateNewToken = () => {
      const token = generateCSRFToken();
      setCsrfToken(token);
      // Store in sessionStorage for the current session
      sessionStorage.setItem(CSRF_TOKEN_KEY, token);
      return token;
    };

    // Try to get existing token first
    const existingToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (existingToken) {
      setCsrfToken(existingToken);
    } else {
      generateNewToken();
    }

    // Regenerate token every 30 minutes for security
    const interval = setInterval(generateNewToken, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Validate CSRF token
  const validateToken = useCallback((token) => {
    const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
    return validateCSRFToken(token, storedToken);
  }, []);

  // Get headers with CSRF token for API requests
  const getCSRFHeaders = useCallback(() => {
    return csrfToken ? { 'X-CSRF-Token': csrfToken } : {};
  }, [csrfToken]);

  // Wrapper for protected API calls
  const protectedApiCall = useCallback(async (apiFunction, ...args) => {
    if (!csrfToken) {
      throw new Error('CSRF token not available');
    }

    // Add CSRF headers to the request
    const headers = getCSRFHeaders();
    
    try {
      // Call the API function with CSRF protection
      return await apiFunction(...args, { csrfHeaders: headers });
    } catch (error) {
      if (error.message?.includes('CSRF')) {
        // If CSRF validation failed, regenerate token
        const newToken = generateCSRFToken();
        setCsrfToken(newToken);
        sessionStorage.setItem(CSRF_TOKEN_KEY, newToken);
      }
      throw error;
    }
  }, [csrfToken, getCSRFHeaders]);

  return {
    csrfToken,
    validateToken,
    getCSRFHeaders,
    protectedApiCall,
    isReady: !!csrfToken
  };
};

/**
 * Higher-order component for CSRF protection
 * Wraps components that perform state-changing operations
 */
export const withCSRFProtection = (WrappedComponent) => {
  return (props) => {
    const csrfProtection = useCSRFProtection();
    
    return (
      <WrappedComponent 
        {...props} 
        csrfProtection={csrfProtection}
      />
    );
  };
};

/**
 * CSRF-protected form component wrapper
 */
export const CSRFProtectedForm = ({ children, onSubmit, ...props }) => {
  const { csrfToken, getCSRFHeaders } = useCSRFProtection();

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    if (!csrfToken) {
      console.error('CSRF token not available');
      return;
    }

    // Add CSRF token to form data
    const formData = new FormData(e.target);
    formData.append('csrf_token', csrfToken);

    onSubmit(e, { csrfToken, headers: getCSRFHeaders() });
  }, [csrfToken, getCSRFHeaders, onSubmit]);

  return (
    <form {...props} onSubmit={handleSubmit}>
      {/* Hidden CSRF token input */}
      <input 
        type="hidden" 
        name="csrf_token" 
        value={csrfToken || ''} 
      />
      {children}
    </form>
  );
};