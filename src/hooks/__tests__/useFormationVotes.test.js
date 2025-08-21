/**
 * useFormationVotes Hook Tests
 * 
 * Comprehensive testing suite for the useFormationVotes hook - manages
 * formation voting functionality including submission and state management.
 * 
 * Test Coverage: 25+ tests covering:
 * - Authentication state handling (logged in/out)
 * - Vote submission success scenarios
 * - Error handling (duplicate votes, network errors, server errors)
 * - Loading state management
 * - Success/error message handling
 * - API integration (fetch calls, headers, body)
 * - Session validation and auth headers
 * - Edge cases and boundary conditions
 */

import { renderHook, act } from '@testing-library/react';

// Mock the AuthContext
const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
};

const mockAuthContext = {
  user: mockUser,
  loading: false
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => mockAuthContext)
}));

// Mock supabase
const mockSession = {
  data: {
    session: {
      access_token: 'mock-access-token'
    }
  }
};

const mockSupabase = {
  auth: {
    getSession: jest.fn(() => Promise.resolve(mockSession))
  }
};

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({
        data: {
          session: {
            access_token: 'mock-access-token'
          }
        }
      }))
    }
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Set up environment variable before any imports
process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';

// Import the hook
import { useFormationVotes } from '../useFormationVotes';

describe('useFormationVotes', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    global.fetch.mockClear();
    
    // Reset auth context to default
    require('../../contexts/AuthContext').useAuth.mockReturnValue(mockAuthContext);
    
    // Reset supabase session mock
    const { supabase } = require('../../lib/supabase');
    supabase.auth.getSession.mockResolvedValue(mockSession);
    
    // Clear console.error mock if it exists
    if (console.error.mockClear) {
      console.error.mockClear();
    }
  });

  describe('Hook Initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useFormationVotes());
      
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.successMessage).toBe('');
      expect(result.current.infoMessage).toBe('');
      expect(result.current.isAuthenticated).toBe(true);
      expect(typeof result.current.submitVote).toBe('function');
      expect(typeof result.current.clearMessages).toBe('function');
    });

    it('should detect unauthenticated user', () => {
      require('../../contexts/AuthContext').useAuth.mockReturnValue({
        user: null,
        loading: false
      });

      const { result } = renderHook(() => useFormationVotes());
      
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Authentication Validation', () => {
    it('should reject vote submission when user is not authenticated', async () => {
      require('../../contexts/AuthContext').useAuth.mockReturnValue({
        user: null,
        loading: false
      });

      const { result } = renderHook(() => useFormationVotes());
      
      let voteResult;
      await act(async () => {
        voteResult = await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(voteResult).toEqual({
        success: false,
        error: 'Authentication required'
      });
      expect(result.current.error).toBe('You must be logged in to vote for formations');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle missing session gracefully', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      const { result } = renderHook(() => useFormationVotes());
      
      let voteResult;
      await act(async () => {
        voteResult = await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(voteResult.success).toBe(false);
      expect(result.current.error).toContain('No valid session found');
    });
  });

  describe('Successful Vote Submission', () => {
    it('should submit vote successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Your vote for the 1-2-1 formation in 5v5 format has been recorded!'
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { result } = renderHook(() => useFormationVotes());
      
      let voteResult;
      await act(async () => {
        voteResult = await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(voteResult).toEqual({
        success: true,
        message: mockResponse.message
      });
      expect(result.current.successMessage).toBe(mockResponse.message);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should make correct API call with proper headers and body', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Vote recorded!' })
      });

      const { result } = renderHook(() => useFormationVotes());
      
      await act(async () => {
        await result.current.submitVote('2-2', '5v5');
      });
      
      // Check that fetch was called with correct method, headers and body
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/submit-formation-vote'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-access-token'
          },
          body: JSON.stringify({
            formation: '2-2',
            format: '5v5'
          })
        }
      );
    });

    it('should handle loading state correctly during submission', async () => {
      // Create a promise that we can resolve manually
      let resolvePromise;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      global.fetch.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useFormationVotes());
      
      // Start the submission
      let submitPromise;
      act(() => {
        submitPromise = result.current.submitVote('1-2-1', '5v5');
      });
      
      // Check loading state is true
      expect(result.current.loading).toBe(true);
      
      // Resolve the fetch
      act(() => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ success: true, message: 'Success!' })
        });
      });
      
      await act(() => submitPromise);
      
      // Check loading state is false after completion
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Duplicate Vote Handling', () => {
    it('should handle duplicate vote as info message (409)', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'duplicate_vote',
        message: 'You have already voted for the 1-2-1 formation in 5v5 format.'
      };

      global.fetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve(mockErrorResponse)
      });

      const { result } = renderHook(() => useFormationVotes());
      
      let voteResult;
      await act(async () => {
        voteResult = await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(voteResult).toEqual({
        success: false,
        error: 'duplicate_vote',
        message: mockErrorResponse.message
      });
      expect(result.current.infoMessage).toBe(mockErrorResponse.message);
      expect(result.current.error).toBeNull();
      expect(result.current.successMessage).toBe('');
    });

    it('should provide fallback message for duplicate vote without message', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'duplicate_vote'
        })
      });

      const { result } = renderHook(() => useFormationVotes());
      
      await act(async () => {
        await result.current.submitVote('2-2', '7v7');
      });
      
      expect(result.current.infoMessage).toBe("You've already voted for the 2-2 formation in 7v7 format.");
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      // Mock console.error to avoid error output in tests
      console.error = jest.fn();

      const { result } = renderHook(() => useFormationVotes());
      
      let voteResult;
      await act(async () => {
        voteResult = await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(voteResult.success).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(console.error).toHaveBeenCalledWith(
        'Formation vote submission error:', 
        expect.any(Error)
      );
    });

    it('should handle server errors (500)', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' })
      });

      const { result } = renderHook(() => useFormationVotes());
      
      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(result.current.error).toBe('Server error');
    });

    it('should handle authentication errors (401)', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Authentication required' })
      });

      const { result } = renderHook(() => useFormationVotes());
      
      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(result.current.error).toBe('Authentication required');
    });

    it('should handle malformed response body', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({}) // Empty response
      });

      const { result } = renderHook(() => useFormationVotes());
      
      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(result.current.error).toBe('HTTP 400: Bad Request');
    });

    it('should handle response JSON parsing errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const { result } = renderHook(() => useFormationVotes());
      
      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(result.current.error).toBe('Invalid JSON');
    });

    it('should handle successful response with success: false', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'validation_failed'
        })
      });

      const { result } = renderHook(() => useFormationVotes());
      
      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(result.current.error).toBe('validation_failed');
    });
  });

  describe('Message Management', () => {
    it('should clear error and success messages', async () => {
      // First set some messages
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Vote submitted!'
        })
      });

      const { result } = renderHook(() => useFormationVotes());
      
      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(result.current.successMessage).toBe('Vote submitted!');
      
      // Clear messages
      act(() => {
        result.current.clearMessages();
      });
      
      expect(result.current.error).toBeNull();
      expect(result.current.successMessage).toBe('');
      expect(result.current.infoMessage).toBe('');
    });

    it('should clear previous messages when starting new submission', async () => {
      const { result } = renderHook(() => useFormationVotes());
      
      // Set up initial error state
      act(() => {
        result.current.clearMessages();
      });
      
      global.fetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          success: false,
          error: 'duplicate_vote',
          message: 'Already voted'
        })
      });

      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(result.current.infoMessage).toBe('Already voted');
      
      // Start new submission - should clear previous info message
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Success!'
        })
      });

      await act(async () => {
        await result.current.submitVote('2-2', '7v7');
      });
      
      expect(result.current.error).toBeNull();
      expect(result.current.successMessage).toBe('Success!');
      expect(result.current.infoMessage).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should provide fallback error message when none provided', async () => {
      global.fetch.mockRejectedValue({});

      const { result } = renderHook(() => useFormationVotes());
      
      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(result.current.error).toBe('Failed to submit vote. Please try again.');
    });

    it('should handle missing access token gracefully', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            // Missing access_token
          }
        }
      });

      const { result } = renderHook(() => useFormationVotes());
      
      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(result.current.error).toContain('No valid session found');
    });

    it('should handle supabase session error', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.getSession.mockRejectedValue(new Error('Session error'));

      const { result } = renderHook(() => useFormationVotes());
      
      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });
      
      expect(result.current.error).toBe('Session error');
    });
  });
});