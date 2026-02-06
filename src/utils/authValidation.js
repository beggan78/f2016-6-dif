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
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: true, // Required by Supabase
  requireSpecialChar: false // Not required by Supabase
};

/**
 * Validation error messages (English fallback defaults)
 * When a `t` function is available, use getValidationMessages(t) for translated messages.
 */
export const VALIDATION_MESSAGES = {
  email: {
    required: 'Email is required',
    invalid: 'Please enter a valid email address'
  },
  password: {
    required: 'Password is required',
    tooShort: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`,
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
 * Gets translated validation messages using the i18n `t` function.
 * Falls back to VALIDATION_MESSAGES if `t` is not provided.
 * @param {Function} t - i18n translation function (from useTranslation('auth'))
 * @returns {Object} Translated validation messages
 */
export const getValidationMessages = (t) => {
  if (!t) return VALIDATION_MESSAGES;
  return {
    email: {
      required: t('validation.email.required'),
      invalid: t('validation.email.invalid')
    },
    password: {
      required: t('validation.password.required'),
      tooShort: t('validation.password.tooShort'),
      missingNumber: t('validation.password.missingNumber'),
      missingSpecialChar: t('validation.password.missingSpecialChar')
    },
    confirmPassword: {
      required: t('validation.confirmPassword.required'),
      mismatch: t('validation.confirmPassword.mismatch')
    },
    otp: {
      required: t('validation.otp.required'),
      invalid: t('validation.otp.invalid'),
      tooShort: t('validation.otp.tooShort'),
      notNumeric: t('validation.otp.notNumeric')
    },
    general: {
      unexpected: t('validation.general.unexpected')
    }
  };
};

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @param {Object} options - Validation options
 * @param {Function} options.t - Optional i18n translation function for translated messages
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validateEmail = (email, options = {}) => {
  const messages = getValidationMessages(options.t);
  if (!email || !email.trim()) {
    return {
      isValid: false,
      error: messages.email.required
    };
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return {
      isValid: false,
      error: messages.email.invalid
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
 * @param {Function} options.t - Optional i18n translation function for translated messages
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validatePassword = (password, options = {}) => {
  const { skipComplexity = false } = options;
  const messages = getValidationMessages(options.t);

  if (!password) {
    return {
      isValid: false,
      error: messages.password.required
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
      error: messages.password.tooShort
    };
  }

  // Number requirement (check first to match Supabase order)
  if (PASSWORD_REQUIREMENTS.requireNumber && !/(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      error: messages.password.missingNumber
    };
  }

  // Case requirements
  if (PASSWORD_REQUIREMENTS.requireUppercase && PASSWORD_REQUIREMENTS.requireLowercase) {
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
      return {
        isValid: false,
        error: messages.password.missingUppercase
      };
    }
  }

  // Special character requirement (if enabled)
  if (PASSWORD_REQUIREMENTS.requireSpecialChar && !/(?=.*[!@#$%^&*])/.test(password)) {
    return {
      isValid: false,
      error: messages.password.missingSpecialChar
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
 * @param {Object} options - Validation options
 * @param {Function} options.t - Optional i18n translation function for translated messages
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validatePasswordConfirmation = (password, confirmPassword, options = {}) => {
  const messages = getValidationMessages(options.t);
  if (!confirmPassword) {
    return {
      isValid: false,
      error: messages.confirmPassword.required
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: messages.confirmPassword.mismatch
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
 * @param {Object} options - Validation options
 * @param {Function} options.t - Optional i18n translation function for translated messages
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validateLoginForm = (formData, options = {}) => {
  const errors = {};

  const emailValidation = validateEmail(formData.email, options);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }

  const passwordValidation = validatePassword(formData.password, { skipComplexity: true, ...options });
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
 * @param {Object} options - Validation options
 * @param {Function} options.t - Optional i18n translation function for translated messages
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validateSignupForm = (formData, options = {}) => {
  const errors = {};

  const emailValidation = validateEmail(formData.email, options);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }

  const passwordValidation = validatePassword(formData.password, options);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
  }

  const confirmPasswordValidation = validatePasswordConfirmation(
    formData.password,
    formData.confirmPassword,
    options
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
 * @param {Object} options - Validation options
 * @param {Function} options.t - Optional i18n translation function for translated messages
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validateResetPasswordForm = (formData, options = {}) => {
  const errors = {};

  const emailValidation = validateEmail(formData.email, options);
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
 * @param {Object} options - Validation options
 * @param {Function} options.t - Optional i18n translation function for translated messages
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validateOtpCode = (code, options = {}) => {
  const messages = getValidationMessages(options.t);
  if (!code || !code.trim()) {
    return {
      isValid: false,
      error: messages.otp.required
    };
  }

  const trimmedCode = code.trim();

  // Must be exactly 6 characters
  if (trimmedCode.length !== 6) {
    return {
      isValid: false,
      error: messages.otp.tooShort
    };
  }

  // Must be all numeric
  if (!/^\d{6}$/.test(trimmedCode)) {
    return {
      isValid: false,
      error: messages.otp.notNumeric
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
  } else if (PASSWORD_REQUIREMENTS.requireUppercase || PASSWORD_REQUIREMENTS.requireLowercase) {
    // If only one case is required
    requirements.push(PASSWORD_REQUIREMENTS.requireUppercase ? 'uppercase letters' : 'lowercase letters');
  } else {
    // No case requirements - just mention letters
    requirements.push('letters');
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
  
  if (requirements.length === 2) {
    return `Must be ${requirements[0]} with ${requirements[1]}`;
  }
  
  const last = requirements.pop();
  return `Must be ${requirements.join(', ')} and ${last}`;
};