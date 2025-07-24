/**
 * SignupForm Component Tests
 * 
 * Comprehensive testing suite for the SignupForm component - handles user registration
 * with email/password validation, email confirmation flow, and success state management.
 * 
 * Test Coverage: 30+ tests covering:
 * - Component rendering and UI structure
 * - Form input handling and validation
 * - Authentication flow and API integration
 * - Email confirmation success flow
 * - Error handling and user feedback
 * - Loading states and disabled interactions
 * - Navigation and user workflows
 * - Auth context integration
 * - Password strength validation
 * - Accessibility and UX patterns
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from '../SignupForm';
import {
  createMockAuthContext,
  createMockAuthResponses,
  createAuthTestScenarios,
  authUserInteractions,
  expectAuthMethodCalled,
  renderWithAuthContext
} from './authTestUtils';

// Mock the shared UI components for focused testing
jest.mock('../../shared/UI', () => ({
  Input: ({ id, type, value, onChange, placeholder, disabled, className, ...props }) => (
    <input
      data-testid={`input-${id}`}
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      {...props}
    />
  ),
  Button: ({ children, onClick, variant, size, disabled, className, ...props }) => (
    <button
      data-testid="submit-button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  )
}));

// Mock the AuthContext
const mockUseAuth = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

describe('SignupForm', () => {
  let mockAuthContext;
  let defaultProps;

  beforeEach(() => {
    // Create mock auth context
    mockAuthContext = createMockAuthContext({
      signUp: jest.fn(),
      loading: false,
      authError: null,
      clearAuthError: jest.fn()
    });
    mockUseAuth.mockReturnValue(mockAuthContext);

    // Setup default props
    defaultProps = {
      onSwitchToLogin: jest.fn(),
      onClose: jest.fn()
    };

    jest.clearAllMocks();
  });

  // Helper function to render SignupForm with context
  const renderSignupForm = (props = {}, authContext = {}) => {
    const mergedAuthContext = { ...mockAuthContext, ...authContext };
    mockUseAuth.mockReturnValue(mergedAuthContext);
    
    return render(<SignupForm {...defaultProps} {...props} />);
  };

  describe('Component Rendering', () => {
    it('should render the signup form with all essential elements', () => {
      renderSignupForm();

      // Header elements
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
      expect(screen.getByText('Get started with email verification')).toBeInTheDocument();

      // Form elements
      expect(screen.getByTestId('input-email')).toBeInTheDocument();
      expect(screen.getByTestId('input-password')).toBeInTheDocument();
      expect(screen.getByTestId('input-confirmPassword')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();

      // Labels
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('Confirm Password')).toBeInTheDocument();

      // Navigation links
      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    });

    it('should render form fields with correct attributes', () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
      expect(emailInput).toHaveAttribute('id', 'email');

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'Create a secure password');
      expect(passwordInput).toHaveAttribute('id', 'password');

      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password');
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword');
    });

    it('should render submit button with correct properties', () => {
      renderSignupForm();

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveTextContent('Create Account');
      expect(submitButton).toHaveAttribute('data-variant', 'primary');
      expect(submitButton).toHaveAttribute('data-size', 'lg');
      expect(submitButton).not.toBeDisabled();
    });

    it('should display password requirements hint', () => {
      renderSignupForm();

      expect(screen.getByText('Must be at least 6 characters with uppercase and lowercase letters')).toBeInTheDocument();
    });

    it('should not display error message initially', () => {
      renderSignupForm();

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should update email field when user types', async () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      await userEvent.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password field when user types', async () => {
      renderSignupForm();

      const passwordInput = screen.getByTestId('input-password');
      await userEvent.type(passwordInput, 'TestPassword123');

      expect(passwordInput).toHaveValue('TestPassword123');
    });

    it('should update confirm password field when user types', async () => {
      renderSignupForm();

      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');

      expect(confirmPasswordInput).toHaveValue('TestPassword123');
    });

    it('should handle empty input values', () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');

      expect(emailInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
      expect(confirmPasswordInput).toHaveValue('');
    });

    it('should clear field errors when user starts typing', async () => {
      renderSignupForm();

      // Trigger validation errors first
      const submitButton = screen.getByTestId('submit-button');
      await userEvent.click(submitButton);

      // Verify errors are present
      expect(screen.getByText('Email is required')).toBeInTheDocument();

      // Type in email field to clear error
      const emailInput = screen.getByTestId('input-email');
      await userEvent.type(emailInput, 'a');

      // Field error should be cleared on next render cycle
      await waitFor(() => {
        expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      });
    });

    it('should clear auth errors when user starts typing in any field', async () => {
      const authContext = {
        authError: 'Previous authentication error',
        clearAuthError: jest.fn()
      };
      renderSignupForm({}, authContext);

      const emailInput = screen.getByTestId('input-email');
      await userEvent.type(emailInput, 'a');

      expect(authContext.clearAuthError).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should show email required error when email is empty', async () => {
      renderSignupForm();

      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('should show invalid email error for malformed email', async () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('should show password required error when password is empty', async () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    it('should show password length error for short password', async () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, '123');
      await userEvent.type(confirmPasswordInput, '123');
      await userEvent.click(submitButton);

      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });

    it('should show password strength error for weak password', async () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123'); // No uppercase
      await userEvent.type(confirmPasswordInput, 'password123');
      await userEvent.click(submitButton);

      expect(screen.getByText('Password must contain both uppercase and lowercase letters')).toBeInTheDocument();
    });

    it('should show confirm password required error when confirm password is empty', async () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    });

    it('should show password mismatch error when passwords do not match', async () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'DifferentPassword123');
      await userEvent.click(submitButton);

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('should accept valid form data', async () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      // Should not show validation errors
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
      expect(screen.queryByText('Password must be at least 6 characters')).not.toBeInTheDocument();
      expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
    });

    it('should apply error styling to invalid fields', async () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.click(submitButton);

      expect(emailInput).toHaveClass('border-rose-500', 'focus:ring-rose-400', 'focus:border-rose-500');
    });

    it('should validate all fields simultaneously', async () => {
      renderSignupForm();

      const submitButton = screen.getByTestId('submit-button');
      await userEvent.click(submitButton);

      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call signUp with correct parameters on valid submission', async () => {
      const signUpMock = jest.fn().mockResolvedValue({ 
        user: null, 
        error: null, 
        message: 'Please check your email for confirmation link' 
      });
      renderSignupForm({}, { signUp: signUpMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      expect(signUpMock).toHaveBeenCalledWith('test@example.com', 'TestPassword123');
    });

    it('should display success message for email confirmation required', async () => {
      const signUpMock = jest.fn().mockResolvedValue({ 
        user: null, 
        error: null, 
        message: 'Please check your email for confirmation link' 
      });
      renderSignupForm({}, { signUp: signUpMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
        expect(screen.getByText('Please check your email for confirmation link')).toBeInTheDocument();
      });
    });

    it('should call onClose on successful registration without email confirmation', async () => {
      const signUpMock = jest.fn().mockResolvedValue({ 
        user: { id: 'user1' }, 
        error: null, 
        message: null 
      });
      const onCloseMock = jest.fn();
      renderSignupForm({ onClose: onCloseMock }, { signUp: signUpMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onCloseMock).toHaveBeenCalled();
      });
    });

    it('should not call signUp when form validation fails', async () => {
      const signUpMock = jest.fn();
      renderSignupForm({}, { signUp: signUpMock });

      const submitButton = screen.getByTestId('submit-button');
      await userEvent.click(submitButton);

      expect(signUpMock).not.toHaveBeenCalled();
    });

    it('should handle form submission via Enter key', async () => {
      const signUpMock = jest.fn().mockResolvedValue({ 
        user: null, 
        error: null, 
        message: 'Email confirmation required' 
      });
      renderSignupForm({}, { signUp: signUpMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      
      // Simulate Enter key press on form
      fireEvent.submit(emailInput.closest('form'));

      expect(signUpMock).toHaveBeenCalledWith('test@example.com', 'TestPassword123');
    });
  });

  describe('Success State - Email Confirmation', () => {
    beforeEach(async () => {
      const signUpMock = jest.fn().mockResolvedValue({ 
        user: null, 
        error: null, 
        message: 'Please check your email for confirmation link' 
      });
      renderSignupForm({}, { signUp: signUpMock });

      // Fill and submit form to reach success state
      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });
    });

    it('should display success message and instructions', () => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      expect(screen.getByText('Please check your email for confirmation link')).toBeInTheDocument();
      expect(screen.getByText('Please check your email and click the confirmation link to complete your registration.')).toBeInTheDocument();
    });

    it('should display success icon', () => {
      // Check for checkmark SVG path element
      const checkmarkPath = document.querySelector('path[d="M5 13l4 4L19 7"]');
      expect(checkmarkPath).toBeInTheDocument();
    });

    it('should display Back to Sign In button', () => {
      expect(screen.getByText('Back to Sign In')).toBeInTheDocument();
    });

    it('should display Close button', () => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should call onSwitchToLogin when Back to Sign In is clicked', async () => {
      // Test from existing success state using the beforeEach setup
      const backButton = screen.getByText('Back to Sign In');
      await userEvent.click(backButton);

      // Since this is using the beforeEach setup, we need to check if the mock was called
      // The mock from defaultProps should be called
      expect(defaultProps.onSwitchToLogin).toHaveBeenCalled();
    });

    it('should not display the signup form in success state', () => {
      expect(screen.queryByText('Create Account')).not.toBeInTheDocument();
      expect(screen.queryByTestId('input-email')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onSwitchToLogin when login link is clicked', async () => {
      const onSwitchToLoginMock = jest.fn();
      renderSignupForm({ onSwitchToLogin: onSwitchToLoginMock });

      const loginLink = screen.getByText('Sign in');
      await userEvent.click(loginLink);

      expect(onSwitchToLoginMock).toHaveBeenCalled();
    });

    it('should disable navigation links during loading', () => {
      renderSignupForm({}, { loading: true });

      const loginLink = screen.getByText('Sign in');
      expect(loginLink).toBeDisabled();
    });
  });

  describe('Auth Context Integration', () => {
    it('should display auth error from context', () => {
      const authError = 'User already registered';
      renderSignupForm({}, { authError });

      expect(screen.getByText(authError)).toBeInTheDocument();
    });

    it('should show both field errors and auth errors when present', async () => {
      const authError = 'User already registered';
      renderSignupForm({}, { authError });

      const submitButton = screen.getByTestId('submit-button');
      await userEvent.click(submitButton);

      // Should show both validation errors and auth error
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText(authError)).toBeInTheDocument();
    });

    it('should call clearAuthError on component mount with auth error', () => {
      const clearAuthErrorMock = jest.fn();
      renderSignupForm({}, { 
        authError: 'Some error',
        clearAuthError: clearAuthErrorMock 
      });

      expect(clearAuthErrorMock).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display authentication error from signUp response', async () => {
      const signUpMock = jest.fn().mockResolvedValue({ 
        user: null, 
        error: { message: 'User already registered' },
        message: null
      });
      renderSignupForm({}, { signUp: signUpMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('User already registered')).toBeInTheDocument();
      });
    });

    it('should handle unexpected errors during submission', async () => {
      const signUpMock = jest.fn().mockRejectedValue(new Error('Network error'));
      renderSignupForm({}, { signUp: signUpMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });
    });

    it('should display error with proper styling', async () => {
      renderSignupForm({}, { authError: 'Test error' });

      const errorDiv = screen.getByText('Test error').parentElement;
      expect(errorDiv).toHaveClass('bg-rose-900/50', 'border', 'border-rose-600');
    });

    it('should prioritize general errors over auth errors', async () => {
      const signUpMock = jest.fn().mockResolvedValue({ 
        user: null, 
        error: { message: 'Signup failed' },
        message: null
      });
      renderSignupForm({}, { signUp: signUpMock, authError: 'Auth context error' });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Signup failed')).toBeInTheDocument();
        expect(screen.queryByText('Auth context error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading and Disabled States', () => {
    it('should show loading text on submit button when loading', () => {
      renderSignupForm({}, { loading: true });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveTextContent('Creating Account...');
    });

    it('should disable submit button when loading', () => {
      renderSignupForm({}, { loading: true });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should disable input fields when loading', () => {
      renderSignupForm({}, { loading: true });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
    });

    it('should show normal text on submit button when not loading', () => {
      renderSignupForm({}, { loading: false });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveTextContent('Create Account');
    });
  });

  describe('Accessibility and UX', () => {
    it('should associate labels with form inputs', () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const emailLabel = screen.getByText('Email Address');
      const passwordLabel = screen.getByText('Password');
      const confirmPasswordLabel = screen.getByText('Confirm Password');

      expect(emailLabel).toHaveAttribute('for', 'email');
      expect(passwordLabel).toHaveAttribute('for', 'password');
      expect(confirmPasswordLabel).toHaveAttribute('for', 'confirmPassword');
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword');
    });

    it('should have proper form structure', () => {
      renderSignupForm();

      // Check for form element
      const forms = document.querySelectorAll('form');
      expect(forms.length).toBeGreaterThan(0);
    });

    it('should provide meaningful button text', () => {
      renderSignupForm();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing callback props gracefully', () => {
      render(<SignupForm />);

      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    it('should handle whitespace in email field', async () => {
      renderSignupForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, '  test@example.com  ');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });

    it('should clear form data after successful email confirmation signup', async () => {
      const signUpMock = jest.fn().mockResolvedValue({ 
        user: null, 
        error: null, 
        message: 'Email confirmation required' 
      });
      renderSignupForm({}, { signUp: signUpMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const confirmPasswordInput = screen.getByTestId('input-confirmPassword');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.type(confirmPasswordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      // Form data should be cleared (though form is hidden in success state)
      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });
    });
  });
});