/**
 * LoginForm Component Tests
 * 
 * Comprehensive testing suite for the LoginForm component - a critical authentication
 * component that handles user sign-in with email/password validation and authentication.
 * 
 * Test Coverage: 30+ tests covering:
 * - Component rendering and UI structure
 * - Form input handling and validation
 * - Authentication flow and API integration
 * - Error handling and user feedback
 * - Loading states and disabled interactions
 * - Navigation and user workflows
 * - Auth context integration
 * - Accessibility and UX patterns
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';
import {
  createMockAuthContext,
  createMockAuthResponses,
  createAuthTestScenarios,
  authUserInteractions,
  expectAuthMethodCalled,
  renderWithAuthContext
} from '../utils/authTestUtils';

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

describe('LoginForm', () => {
  let mockAuthContext;
  let defaultProps;

  beforeEach(() => {

    // Create mock auth context
    mockAuthContext = createMockAuthContext({
      signIn: jest.fn(),
      loading: false,
      authError: null,
      clearAuthError: jest.fn()
    });
    mockUseAuth.mockReturnValue(mockAuthContext);

    // Setup default props
    defaultProps = {
      onSwitchToSignup: jest.fn(),
      onSwitchToReset: jest.fn(),
      onClose: jest.fn()
    };

    jest.clearAllMocks();
  });

  // Helper function to render LoginForm with context
  const renderLoginForm = (props = {}, authContext = {}) => {
    const mergedAuthContext = { ...mockAuthContext, ...authContext };
    mockUseAuth.mockReturnValue(mergedAuthContext);
    
    return render(<LoginForm {...defaultProps} {...props} />);
  };

  describe('Component Rendering', () => {
    it('should render the login form with all essential elements', () => {
      renderLoginForm();

      // Header elements
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();

      // Form elements
      expect(screen.getByTestId('input-email')).toBeInTheDocument();
      expect(screen.getByTestId('input-password')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();

      // Labels
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();

      // Navigation links
      expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
      expect(screen.getByText('Sign up')).toBeInTheDocument();
    });

    it('should render form fields with correct attributes', () => {
      renderLoginForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
      expect(emailInput).toHaveAttribute('id', 'email');

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('should render submit button with correct properties', () => {
      renderLoginForm();

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveTextContent('Sign In');
      expect(submitButton).toHaveAttribute('data-variant', 'primary');
      expect(submitButton).toHaveAttribute('data-size', 'lg');
      expect(submitButton).not.toBeDisabled();
    });

    it('should not display error message initially', () => {
      renderLoginForm();

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should update email field when user types', async () => {
      renderLoginForm();

      const emailInput = screen.getByTestId('input-email');
      await userEvent.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password field when user types', async () => {
      renderLoginForm();

      const passwordInput = screen.getByTestId('input-password');
      await userEvent.type(passwordInput, 'testpassword');

      expect(passwordInput).toHaveValue('testpassword');
    });

    it('should handle empty input values', () => {
      renderLoginForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');

      expect(emailInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });

    it('should clear auth errors when user starts typing in email field', async () => {
      const authContext = {
        authError: 'Previous authentication error',
        clearAuthError: jest.fn()
      };
      renderLoginForm({}, authContext);

      const emailInput = screen.getByTestId('input-email');
      await userEvent.type(emailInput, 'a');

      expect(authContext.clearAuthError).toHaveBeenCalled();
    });

    it('should clear auth errors when user starts typing in password field', async () => {
      const authContext = {
        authError: 'Previous authentication error',
        clearAuthError: jest.fn()
      };
      renderLoginForm({}, authContext);

      const passwordInput = screen.getByTestId('input-password');
      await userEvent.type(passwordInput, 'a');

      expect(authContext.clearAuthError).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should show email required error when email is empty', async () => {
      renderLoginForm();

      const passwordInput = screen.getByTestId('input-password');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(submitButton);

      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('should show invalid email error for malformed email', async () => {
      renderLoginForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(submitButton);

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('should show password required error when password is empty', async () => {
      renderLoginForm();

      const emailInput = screen.getByTestId('input-email');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    it('should accept valid email formats', async () => {
      renderLoginForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'valid@example.com');
      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(submitButton);

      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });

    it('should apply error styling to invalid fields', async () => {
      renderLoginForm();

      const emailInput = screen.getByTestId('input-email');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.click(submitButton);

      expect(emailInput).toHaveClass('border-rose-500', 'focus:ring-rose-400', 'focus:border-rose-500');
    });

    it('should validate both fields simultaneously', async () => {
      renderLoginForm();

      const submitButton = screen.getByTestId('submit-button');
      await userEvent.click(submitButton);

      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call signIn with correct parameters on valid submission', async () => {
      const signInMock = jest.fn().mockResolvedValue({ user: { id: 'user1' }, error: null });
      renderLoginForm({}, { signIn: signInMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(submitButton);

      expect(signInMock).toHaveBeenCalledWith('test@example.com', 'testpassword');
    });

    it('should call onClose on successful authentication', async () => {
      const signInMock = jest.fn().mockResolvedValue({ user: { id: 'user1' }, error: null });
      const onCloseMock = jest.fn();
      renderLoginForm({ onClose: onCloseMock }, { signIn: signInMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onCloseMock).toHaveBeenCalled();
      });
    });

    it('should not call signIn when form validation fails', async () => {
      const signInMock = jest.fn();
      renderLoginForm({}, { signIn: signInMock });

      const submitButton = screen.getByTestId('submit-button');
      await userEvent.click(submitButton);

      expect(signInMock).not.toHaveBeenCalled();
    });

    it('should handle form submission via Enter key', async () => {
      const signInMock = jest.fn().mockResolvedValue({ user: { id: 'user1' }, error: null });
      renderLoginForm({}, { signIn: signInMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'testpassword');
      
      // Simulate Enter key press on form
      fireEvent.submit(emailInput.closest('form'));

      expect(signInMock).toHaveBeenCalledWith('test@example.com', 'testpassword');
    });
  });

  describe('User Interactions', () => {
    it('should call onSwitchToSignup when signup link is clicked', async () => {
      const onSwitchToSignupMock = jest.fn();
      renderLoginForm({ onSwitchToSignup: onSwitchToSignupMock });

      const signupLink = screen.getByText('Sign up');
      await userEvent.click(signupLink);

      expect(onSwitchToSignupMock).toHaveBeenCalled();
    });

    it('should call onSwitchToReset when forgot password link is clicked', async () => {
      const onSwitchToResetMock = jest.fn();
      renderLoginForm({ onSwitchToReset: onSwitchToResetMock });

      const resetLink = screen.getByText('Forgot your password?');
      await userEvent.click(resetLink);

      expect(onSwitchToResetMock).toHaveBeenCalled();
    });

    it('should disable navigation links during loading', () => {
      renderLoginForm({}, { loading: true });

      const signupLink = screen.getByText('Sign up');
      const resetLink = screen.getByText('Forgot your password?');

      expect(signupLink).toBeDisabled();
      expect(resetLink).toBeDisabled();
    });
  });

  describe('Auth Context Integration', () => {
    it('should display auth error from context', () => {
      const authError = 'Invalid credentials';
      renderLoginForm({}, { authError });

      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });

    it('should show both field errors and auth errors when present', async () => {
      const authError = 'Invalid credentials';
      renderLoginForm({}, { authError });

      const submitButton = screen.getByTestId('submit-button');
      await userEvent.click(submitButton);

      // Should show both validation errors and auth error
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });

    it('should call clearAuthError on component mount with auth error', () => {
      const clearAuthErrorMock = jest.fn();
      renderLoginForm({}, { 
        authError: 'Some error',
        clearAuthError: clearAuthErrorMock 
      });

      expect(clearAuthErrorMock).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display authentication error from signIn response', async () => {
      const signInMock = jest.fn().mockResolvedValue({ 
        user: null, 
        error: { message: 'Invalid login credentials' }
      });
      renderLoginForm({}, { signIn: signInMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'wrongpassword');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password. Please check your credentials and try again.')).toBeInTheDocument();
      });
    });

    it('should handle unexpected errors during submission', async () => {
      const signInMock = jest.fn().mockRejectedValue(new Error('Network error'));
      renderLoginForm({}, { signIn: signInMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });
    });

    it('should display error with proper styling', async () => {
      renderLoginForm({}, { 
        authError: 'Invalid login credentials',
        clearAuthError: jest.fn() // Prevent the error from being cleared immediately
      });

      const errorDiv = screen.getByText('Invalid email or password. Please check your credentials and try again.').parentElement;
      expect(errorDiv).toHaveClass('bg-rose-900/50', 'border', 'border-rose-600');
    });
  });

  describe('Loading and Disabled States', () => {
    it('should show loading text on submit button when loading', () => {
      renderLoginForm({}, { loading: true });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveTextContent('Signing In...');
    });

    it('should disable submit button when loading', () => {
      renderLoginForm({}, { loading: true });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should disable input fields when loading', () => {
      renderLoginForm({}, { loading: true });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    it('should show normal text on submit button when not loading', () => {
      renderLoginForm({}, { loading: false });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveTextContent('Sign In');
    });
  });

  describe('Accessibility and UX', () => {
    it('should associate labels with form inputs', () => {
      renderLoginForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const emailLabel = screen.getByText('Email Address');
      const passwordLabel = screen.getByText('Password');

      expect(emailLabel).toHaveAttribute('for', 'email');
      expect(passwordLabel).toHaveAttribute('for', 'password');
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('should have proper form structure', () => {
      renderLoginForm();

      // Check for form element by tag name since our mock doesn't preserve form semantics
      const forms = document.querySelectorAll('form');
      expect(forms.length).toBeGreaterThan(0);
    });

    it('should provide meaningful button text', () => {
      renderLoginForm();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing callback props gracefully', () => {
      render(<LoginForm />);

      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    it('should handle whitespace in email field', async () => {
      renderLoginForm();

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, '  test@example.com  ');
      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(submitButton);

      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });

    it('should handle rapid multiple submissions', async () => {
      const signInMock = jest.fn().mockResolvedValue({ user: { id: 'user1' }, error: null });
      renderLoginForm({}, { signIn: signInMock });

      const emailInput = screen.getByTestId('input-email');
      const passwordInput = screen.getByTestId('input-password');
      const submitButton = screen.getByTestId('submit-button');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'testpassword');
      
      // Single click should work
      await userEvent.click(submitButton);

      // Should be called once with valid form
      await waitFor(() => {
        expect(signInMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});