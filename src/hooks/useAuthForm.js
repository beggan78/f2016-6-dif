/**
 * useAuthForm Hook
 * 
 * Reusable hook for authentication forms that eliminates duplicate logic.
 * Provides common form functionality including validation, error handling,
 * and auth context integration.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getPrimaryErrorMessage, getErrorDisplayClasses, createDebouncedErrorClear } from '../utils/authErrorHandling';

/**
 * Authentication form hook with common functionality
 * @param {Object} options - Configuration options
 * @param {Function} options.validationFunction - Function to validate form data
 * @param {Object} options.initialFormData - Initial form data
 * @param {Function} options.onSuccess - Success callback
 * @param {boolean} options.clearErrorsOnInput - Whether to clear errors when user types
 * @returns {Object} Form state and handlers
 */
export const useAuthForm = ({
  validationFunction,
  initialFormData = {},
  onSuccess,
  clearErrorsOnInput = true
}) => {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { loading, authError, clearAuthError } = useAuth();

  // Create debounced error clear function
  const debouncedClearAuthError = createDebouncedErrorClear(clearAuthError, 300);

  // Clear auth errors when form data changes
  useEffect(() => {
    if (authError && clearErrorsOnInput) {
      debouncedClearAuthError();
    }
  }, [formData, authError, clearErrorsOnInput, debouncedClearAuthError]);

  /**
   * Update a single form field and optionally clear its error
   * @param {string} field - Field name
   * @param {any} value - Field value
   */
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (clearErrorsOnInput && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  /**
   * Update multiple form fields at once
   * @param {Object} updates - Object with field updates
   */
  const updateFields = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
    
    if (clearErrorsOnInput) {
      const clearedErrors = {};
      Object.keys(updates).forEach(field => {
        if (errors[field]) {
          clearedErrors[field] = null;
        }
      });
      if (Object.keys(clearedErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...clearedErrors }));
      }
    }
  };

  /**
   * Validate the current form data
   * @returns {boolean} Whether the form is valid
   */
  const validateForm = () => {
    if (!validationFunction) {
      return true;
    }
    
    const { isValid, errors: validationErrors } = validationFunction(formData);
    setErrors(validationErrors);
    return isValid;
  };

  /**
   * Handle form submission with validation and error handling
   * @param {Function} submitFunction - Async function to handle submission
   * @param {Object} options - Submission options
   * @returns {Promise} Submission result
   */
  const handleSubmit = async (submitFunction, options = {}) => {
    const { skipValidation = false, onError } = options;
    
    if (!skipValidation && !validateForm()) {
      return { success: false, error: t('errors.validationFailed') };
    }

    setIsSubmitting(true);
    
    try {
      const result = await submitFunction(formData);
      
      if (result.error) {
        setErrors({ general: result.error.message || result.error });
        if (onError) {
          onError(result.error);
        }
      } else if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = t('errors.unexpectedError');
      setErrors({ general: errorMessage });
      if (onError) {
        onError(error);
      }
      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setIsSubmitting(false);
  };

  /**
   * Set a general error message
   * @param {string} message - Error message
   */
  const setGeneralError = (message) => {
    setErrors(prev => ({ ...prev, general: message }));
  };

  /**
   * Clear all errors
   */
  const clearErrors = () => {
    setErrors({});
  };

  // Get primary error message using centralized logic
  const primaryError = getPrimaryErrorMessage({
    formErrors: {}, // Don't show field errors in banner to avoid duplication
    authError,
    generalError: errors.general
  });

  // Get error display classes
  const getErrorClasses = (hasError, variant = 'banner') => {
    return getErrorDisplayClasses(hasError, variant);
  };

  /**
   * Get field-specific error classes and messages
   * @param {string} fieldName - Name of the field
   * @returns {Object} Error state and classes for the field
   */
  const getFieldError = (fieldName) => {
    const hasError = !!errors[fieldName];
    const errorClasses = getErrorDisplayClasses(hasError, 'field');
    
    return {
      hasError,
      message: errors[fieldName],
      inputClasses: errorClasses.container,
      textClasses: errorClasses.text
    };
  };

  return {
    // Form state
    formData,
    errors,
    isSubmitting,
    loading: loading || isSubmitting,
    primaryError,
    
    // Form handlers
    updateField,
    updateFields,
    validateForm,
    handleSubmit,
    resetForm,
    setGeneralError,
    clearErrors,
    
    // Utility functions
    getErrorClasses,
    getFieldError,
    
    // Direct access to individual field handlers for compatibility
    handleInputChange: updateField,
    setFormData,
    setErrors
  };
};

/**
 * Specialized hook for login forms
 * @param {Object} options - Configuration options
 * @returns {Object} Form state and handlers
 */
export const useLoginForm = (options = {}) => {
  const { validateLoginForm } = require('../utils/authValidation');
  
  return useAuthForm({
    validationFunction: validateLoginForm,
    initialFormData: { email: '', password: '' },
    ...options
  });
};

/**
 * Specialized hook for signup forms
 * @param {Object} options - Configuration options
 * @returns {Object} Form state and handlers
 */
export const useSignupForm = (options = {}) => {
  const { validateSignupForm } = require('../utils/authValidation');
  
  return useAuthForm({
    validationFunction: validateSignupForm,
    initialFormData: { email: '', password: '', confirmPassword: '' },
    ...options
  });
};

/**
 * Specialized hook for password reset forms
 * @param {Object} options - Configuration options
 * @returns {Object} Form state and handlers
 */
export const usePasswordResetForm = (options = {}) => {
  const { validateResetPasswordForm } = require('../utils/authValidation');
  
  return useAuthForm({
    validationFunction: validateResetPasswordForm,
    initialFormData: { email: '' },
    ...options
  });
};