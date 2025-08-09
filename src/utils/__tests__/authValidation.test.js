/**
 * Authentication Validation Utilities Tests
 * 
 * Comprehensive testing for authentication validation functions.
 * Ensures validation logic is robust and consistent across auth forms.
 */

import {
  EMAIL_REGEX,
  PASSWORD_REQUIREMENTS,
  VALIDATION_MESSAGES,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateLoginForm,
  validateSignupForm,
  validateResetPasswordForm,
  getPasswordRequirementsText
} from '../authValidation';

describe('Authentication Validation Utilities', () => {
  describe('Constants', () => {
    it('should export EMAIL_REGEX constant', () => {
      expect(EMAIL_REGEX).toBeDefined();
      expect(EMAIL_REGEX).toBeInstanceOf(RegExp);
    });

    it('should export PASSWORD_REQUIREMENTS constant', () => {
      expect(PASSWORD_REQUIREMENTS).toBeDefined();
      expect(typeof PASSWORD_REQUIREMENTS.minLength).toBe('number');
      expect(typeof PASSWORD_REQUIREMENTS.requireUppercase).toBe('boolean');
      expect(typeof PASSWORD_REQUIREMENTS.requireLowercase).toBe('boolean');
    });

    it('should export VALIDATION_MESSAGES constant', () => {
      expect(VALIDATION_MESSAGES).toBeDefined();
      expect(VALIDATION_MESSAGES.email).toBeDefined();
      expect(VALIDATION_MESSAGES.password).toBeDefined();
      expect(VALIDATION_MESSAGES.confirmPassword).toBeDefined();
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user+tag@domain.co.uk',
        'name.lastname@company.org',
        'simple@test.io',
        '123@numbers.net'
      ];

      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBe(null);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        'user@domain',
        'user.domain.com'
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(VALIDATION_MESSAGES.email.invalid);
      });
    });

    it('should reject empty or whitespace-only emails', () => {
      const emptyEmails = ['', '   ', null, undefined];

      emptyEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(VALIDATION_MESSAGES.email.required);
      });
    });

    it('should trim whitespace before validation', () => {
      const result = validateEmail('  test@example.com  ');
      expect(result.isValid).toBe(true);
      expect(result.error).toBe(null);
    });
  });

  describe('validatePassword', () => {
    it('should validate passwords with complexity checking disabled', () => {
      const passwords = ['123', 'simple', 'nocomplex'];

      passwords.forEach(password => {
        const result = validatePassword(password, { skipComplexity: true });
        expect(result.isValid).toBe(true);
        expect(result.error).toBe(null);
      });
    });

    it('should reject empty passwords', () => {
      const emptyPasswords = ['', null, undefined];

      emptyPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(VALIDATION_MESSAGES.password.required);
      });
    });

    it('should reject passwords that are too short', () => {
      const shortPasswords = ['1', '12', '123', '1234', '12345', '123456', '1234567'];

      shortPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(VALIDATION_MESSAGES.password.tooShort);
      });
    });

    it('should reject passwords without numbers', () => {
      const invalidPasswords = [
        'Password', // No numbers
        'ValidPassword', // No numbers
        'TestingPassword' // No numbers
      ];

      invalidPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(VALIDATION_MESSAGES.password.missingNumber);
      });
    });

    it('should accept passwords with letters and numbers (no case requirement)', () => {
      const validPasswords = [
        'alllowercase123',
        'ALLUPPERCASE123',
        'lowercase123',
        'UPPERCASE123',
        'MixedCase123',
        'letters1234'
      ];

      validPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });
    });

    it('should accept valid complex passwords', () => {
      const validPasswords = [
        'Password123',
        'MySecurePass1',
        'ComplexPass1',
        'ValidPassword1',
        'GoodPassword123'
      ];

      validPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.error).toBe(null);
      });
    });
  });

  describe('validatePasswordConfirmation', () => {
    it('should accept matching passwords', () => {
      const password = 'TestPassword123';
      const result = validatePasswordConfirmation(password, password);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should reject non-matching passwords', () => {
      const result = validatePasswordConfirmation('Password123', 'DifferentPassword');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_MESSAGES.confirmPassword.mismatch);
    });

    it('should reject empty confirmation password', () => {
      const emptyConfirmations = ['', null, undefined];

      emptyConfirmations.forEach(confirmPassword => {
        const result = validatePasswordConfirmation('Password123', confirmPassword);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(VALIDATION_MESSAGES.confirmPassword.required);
      });
    });
  });

  describe('validateLoginForm', () => {
    it('should validate correct login form data', () => {
      const formData = {
        email: 'user@example.com',
        password: 'anypassword'
      };

      const result = validateLoginForm(formData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should collect all validation errors', () => {
      const formData = {
        email: 'invalid-email',
        password: ''
      };

      const result = validateLoginForm(formData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe(VALIDATION_MESSAGES.email.invalid);
      expect(result.errors.password).toBe(VALIDATION_MESSAGES.password.required);
    });

    it('should skip password complexity for login', () => {
      const formData = {
        email: 'user@example.com',
        password: 'simple' // Would fail complexity check
      };

      const result = validateLoginForm(formData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });

  describe('validateSignupForm', () => {
    it('should validate correct signup form data', () => {
      const formData = {
        email: 'user@example.com',
        password: 'ValidPassword123',
        confirmPassword: 'ValidPassword123'
      };

      const result = validateSignupForm(formData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should collect all validation errors', () => {
      const formData = {
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different'
      };

      const result = validateSignupForm(formData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
      expect(result.errors.confirmPassword).toBeDefined();
    });

    it('should enforce password complexity for signup', () => {
      const formData = {
        email: 'user@example.com',
        password: 'simple',
        confirmPassword: 'simple'
      };

      const result = validateSignupForm(formData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBeDefined();
    });
  });

  describe('validateResetPasswordForm', () => {
    it('should validate correct reset password form data', () => {
      const formData = {
        email: 'user@example.com'
      };

      const result = validateResetPasswordForm(formData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should reject invalid email', () => {
      const formData = {
        email: 'invalid-email'
      };

      const result = validateResetPasswordForm(formData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe(VALIDATION_MESSAGES.email.invalid);
    });
  });

  describe('getPasswordRequirementsText', () => {
    it('should return formatted requirements text', () => {
      const text = getPasswordRequirementsText();
      
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
      expect(text).toContain('Must be');
      expect(text).toContain('8 characters');
      expect(text).toContain('letters');
      expect(text).toContain('at least one number');
    });
  });

  describe('Integration with existing form patterns', () => {
    it('should match LoginForm validation behavior', () => {
      // Test case that matches LoginForm's validateForm function
      const formData = { email: '', password: '' };
      const result = validateLoginForm(formData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email is required');
      expect(result.errors.password).toBe('Password is required');
    });

    it('should match SignupForm validation behavior', () => {
      // Test case that matches SignupForm's validateForm function
      const formData = {
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'different'
      };
      const result = validateSignupForm(formData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toContain('8 characters');
      expect(result.errors.confirmPassword).toBe('Passwords do not match');
    });

    it('should handle the exact email regex pattern from existing forms', () => {
      // Ensure our EMAIL_REGEX matches the pattern used in LoginForm and SignupForm
      const testEmail = 'test@example.com';
      const existingPattern = /\S+@\S+\.\S+/;
      
      expect(EMAIL_REGEX.test(testEmail)).toBe(existingPattern.test(testEmail));
      expect(EMAIL_REGEX.toString()).toBe(existingPattern.toString());
    });
  });
});