/**
 * useFormationVotes Hook Tests
 *
 * Comprehensive testing suite for the useFormationVotes hook - manages
 * formation voting functionality including submission and state management.
 *
 * Test Coverage:
 * - Authentication state handling (logged in/out)
 * - Vote submission success scenarios
 * - Error handling (duplicate votes, RPC errors, validation errors)
 * - Loading state management
 * - Success/error message handling
 * - RPC integration (supabase.rpc calls)
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
jest.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn()
  }
}));

// Import the hook
import { useFormationVotes } from '../useFormationVotes';

describe('useFormationVotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset auth context to default
    require('../../contexts/AuthContext').useAuth.mockReturnValue(mockAuthContext);

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

      const { supabase } = require('../../lib/supabase');
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('Successful Vote Submission', () => {
    it('should submit vote successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Your vote for the 1-2-1 formation in 5v5 format has been recorded!'
      };

      const { supabase } = require('../../lib/supabase');
      supabase.rpc.mockResolvedValue({ data: mockResponse, error: null });

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

    it('should make correct RPC call with proper parameters', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.rpc.mockResolvedValue({
        data: { success: true, message: 'Vote recorded!' },
        error: null
      });

      const { result } = renderHook(() => useFormationVotes());

      await act(async () => {
        await result.current.submitVote('2-2', '5v5');
      });

      expect(supabase.rpc).toHaveBeenCalledWith('submit_formation_vote', {
        p_formation: '2-2',
        p_format: '5v5'
      });
    });

    it('should handle loading state correctly during submission', async () => {
      // Create a promise that we can resolve manually
      let resolvePromise;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const { supabase } = require('../../lib/supabase');
      supabase.rpc.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useFormationVotes());

      // Start the submission
      let submitPromise;
      act(() => {
        submitPromise = result.current.submitVote('1-2-1', '5v5');
      });

      // Check loading state is true
      expect(result.current.loading).toBe(true);

      // Resolve the RPC call
      act(() => {
        resolvePromise({
          data: { success: true, message: 'Success!' },
          error: null
        });
      });

      await act(() => submitPromise);

      // Check loading state is false after completion
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Duplicate Vote Handling', () => {
    it('should handle duplicate vote as info message', async () => {
      const mockResult = {
        success: false,
        error: 'duplicate_vote',
        message: 'You have already voted for the 1-2-1 formation in 5v5 format.'
      };

      const { supabase } = require('../../lib/supabase');
      supabase.rpc.mockResolvedValue({ data: mockResult, error: null });

      const { result } = renderHook(() => useFormationVotes());

      let voteResult;
      await act(async () => {
        voteResult = await result.current.submitVote('1-2-1', '5v5');
      });

      expect(voteResult).toEqual({
        success: false,
        error: 'duplicate_vote',
        message: mockResult.message
      });
      expect(result.current.infoMessage).toBe(mockResult.message);
      expect(result.current.error).toBeNull();
      expect(result.current.successMessage).toBe('');
    });

    it('should provide fallback message for duplicate vote without message', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.rpc.mockResolvedValue({
        data: {
          success: false,
          error: 'duplicate_vote'
        },
        error: null
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
    it('should handle RPC errors', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection error' }
      });

      console.error = jest.fn();

      const { result } = renderHook(() => useFormationVotes());

      let voteResult;
      await act(async () => {
        voteResult = await result.current.submitVote('1-2-1', '5v5');
      });

      expect(voteResult.success).toBe(false);
      expect(result.current.error).toBe('Database connection error');
      expect(console.error).toHaveBeenCalledWith(
        'Formation vote submission error:',
        expect.any(Error)
      );
    });

    it('should handle RPC error without message', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.rpc.mockResolvedValue({
        data: null,
        error: {}
      });

      const { result } = renderHook(() => useFormationVotes());

      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });

      expect(result.current.error).toBe('Failed to submit vote. Please try again.');
    });

    it('should handle result with success: false and validation error', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.rpc.mockResolvedValue({
        data: {
          success: false,
          error: 'validation_failed'
        },
        error: null
      });

      const { result } = renderHook(() => useFormationVotes());

      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });

      expect(result.current.error).toBe('validation_failed');
    });

    it('should handle unexpected exceptions', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.rpc.mockRejectedValue(new Error('Network error'));

      console.error = jest.fn();

      const { result } = renderHook(() => useFormationVotes());

      let voteResult;
      await act(async () => {
        voteResult = await result.current.submitVote('1-2-1', '5v5');
      });

      expect(voteResult.success).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Message Management', () => {
    it('should clear error and success messages', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.rpc.mockResolvedValue({
        data: { success: true, message: 'Vote submitted!' },
        error: null
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
      const { supabase } = require('../../lib/supabase');
      const { result } = renderHook(() => useFormationVotes());

      // Set up initial info state via duplicate vote
      supabase.rpc.mockResolvedValue({
        data: {
          success: false,
          error: 'duplicate_vote',
          message: 'Already voted'
        },
        error: null
      });

      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });

      expect(result.current.infoMessage).toBe('Already voted');

      // Start new submission - should clear previous info message
      supabase.rpc.mockResolvedValue({
        data: { success: true, message: 'Success!' },
        error: null
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
      const { supabase } = require('../../lib/supabase');
      supabase.rpc.mockRejectedValue({});

      const { result } = renderHook(() => useFormationVotes());

      await act(async () => {
        await result.current.submitVote('1-2-1', '5v5');
      });

      expect(result.current.error).toBe('Failed to submit vote. Please try again.');
    });
  });
});
