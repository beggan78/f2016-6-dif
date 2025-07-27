/**
 * Authentication Validation Utilities
 * 
 * Centralized validation functions for authentication forms.
 * Eliminates code duplication across LoginForm, SignupForm, and other auth components.
 */

/**
 * Regular expression for basic email validation
 * Matches most common email formats
 */
export const EMAIL_REGEX = /\S+@\S+\.\S+/;

/**
 * Password validation requirements
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 6,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: false, // Not currently enforced in SignupForm
  requireSpecialChar: false // Not currently enforced in SignupForm
};

/**
 * Validation error messages
 */
export const VALIDATION_MESSAGES = {
  email: {
    required: 'Email is required',
    invalid: 'Please enter a valid email address'
  },
  password: {
    required: 'Password is required',
    tooShort: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`,
    missingUppercase: 'Password must contain both uppercase and lowercase letters',
    missingLowercase: 'Password must contain both uppercase and lowercase letters',
    missingNumber: 'Password must contain at least one number',
    missingSpecialChar: 'Password must contain at least one special character'
  },
  confirmPassword: {
    required: 'Please confirm your password',
    mismatch: 'Passwords do not match'
  },
  otp: {
    required: 'Verification code is required',
    invalid: 'Please enter a valid 6-digit code',
    tooShort: 'Verification code must be 6 digits',
    notNumeric: 'Verification code must contain only numbers'
  },
  general: {
    unexpected: 'An unexpected error occurred. Please try again.'
  }
};

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.email.required
    };
  }
  
  if (!EMAIL_REGEX.test(email.trim())) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.email.invalid
    };
  }
  
  return {
    isValid: true,
    error: null
  };
};

/**
 * Validates a password based on requirements
 * @param {string} password - The password to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.skipComplexity - Skip complexity requirements (for login)
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validatePassword = (password, options = {}) => {
  const { skipComplexity = false } = options;
  
  if (!password) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.password.required
    };
  }
  
  // Skip complexity checks for login form
  if (skipComplexity) {
    return {
      isValid: true,
      error: null
    };
  }
  
  // Length requirement
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.password.tooShort
    };
  }
  
  // Case requirements
  if (PASSWORD_REQUIREMENTS.requireUppercase && PASSWORD_REQUIREMENTS.requireLowercase) {
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
      return {
        isValid: false,
        error: VALIDATION_MESSAGES.password.missingUppercase
      };
    }
  }
  
  // Number requirement (if enabled)
  if (PASSWORD_REQUIREMENTS.requireNumber && !/(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.password.missingNumber
    };
  }
  
  // Special character requirement (if enabled)
  if (PASSWORD_REQUIREMENTS.requireSpecialChar && !/(?=.*[!@#$%^&*])/.test(password)) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.password.missingSpecialChar
    };
  }
  
  return {
    isValid: true,
    error: null
  };
};

/**
 * Validates password confirmation
 * @param {string} password - The original password
 * @param {string} confirmPassword - The confirmation password
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.confirmPassword.required
    };
  }
  
  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.confirmPassword.mismatch
    };
  }
  
  return {
    isValid: true,
    error: null
  };
};

/**
 * Validates login form data
 * @param {Object} formData - Form data object
 * @param {string} formData.email - Email address
 * @param {string} formData.password - Password
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validateLoginForm = (formData) => {
  const errors = {};
  
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }
  
  const passwordValidation = validatePassword(formData.password, { skipComplexity: true });
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates signup form data
 * @param {Object} formData - Form data object
 * @param {string} formData.email - Email address
 * @param {string} formData.password - Password
 * @param {string} formData.confirmPassword - Password confirmation
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validateSignupForm = (formData) => {
  const errors = {};
  
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }
  
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
  }
  
  const confirmPasswordValidation = validatePasswordConfirmation(
    formData.password, 
    formData.confirmPassword
  );
  if (!confirmPasswordValidation.isValid) {
    errors.confirmPassword = confirmPasswordValidation.error;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates reset password form data
 * @param {Object} formData - Form data object
 * @param {string} formData.email - Email address
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validateResetPasswordForm = (formData) => {
  const errors = {};
  
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates an OTP/verification code
 * @param {string} code - The OTP code to validate
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validateOtpCode = (code) => {
  if (!code || !code.trim()) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.otp.required
    };
  }
  
  const trimmedCode = code.trim();
  
  // Must be exactly 6 characters
  if (trimmedCode.length !== 6) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.otp.tooShort
    };
  }
  
  // Must be all numeric
  if (!/^\d{6}$/.test(trimmedCode)) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.otp.notNumeric
    };
  }
  
  return {
    isValid: true,
    error: null
  };
};

/**
 * Gets user-friendly password requirements text
 * @returns {string} Password requirements description
 */
export const getPasswordRequirementsText = () => {
  const requirements = [];
  
  if (PASSWORD_REQUIREMENTS.minLength > 0) {
    requirements.push(`at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }
  
  if (PASSWORD_REQUIREMENTS.requireUppercase && PASSWORD_REQUIREMENTS.requireLowercase) {
    requirements.push('uppercase and lowercase letters');
  }
  
  if (PASSWORD_REQUIREMENTS.requireNumber) {
    requirements.push('at least one number');
  }
  
  if (PASSWORD_REQUIREMENTS.requireSpecialChar) {
    requirements.push('at least one special character');
  }
  
  if (requirements.length === 0) {
    return '';
  }
  
  if (requirements.length === 1) {
    return `Must be ${requirements[0]}`;
  }
  
  const last = requirements.pop();
  return `Must be ${requirements.join(', ')} and ${last}`;
};