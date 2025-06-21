const MAX_NAME_LENGTH = 50;
const ALLOWED_NAME_PATTERN = /^[a-zA-ZÀ-ÿ0-9\s\-'&.]*$/;

export const sanitizeNameInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  if (input.length > MAX_NAME_LENGTH) {
    input = input.substring(0, MAX_NAME_LENGTH);
  }
  
  if (!ALLOWED_NAME_PATTERN.test(input)) {
    input = input.replace(/[^a-zA-ZÀ-ÿ0-9\s\-'&.]/g, '');
  }
  
  return input;
};

export const isValidNameInput = (input) => {
  if (typeof input !== 'string') {
    return false;
  }
  
  const trimmed = input.trim();
  return trimmed.length <= MAX_NAME_LENGTH && ALLOWED_NAME_PATTERN.test(trimmed);
};