/**
 * Smart Phone Sanitizer for Israeli Numbers
 * - Strips hyphens, spaces, parentheses
 * - Converts +972/972 prefix to local (0)
 * - Prepends 0 if number starts with 5
 */
export const sanitizeIsraeliPhone = (input: string): string => {
  // 1. Strip all non-digits
  let phone = input.replace(/[\s\-()]/g, '');
  
  // 2. Remove + if present
  phone = phone.replace(/^\+/, '');
  
  // 3. Convert international to local (972 -> 0)
  if (phone.startsWith('972')) {
    phone = '0' + phone.slice(3);
  }
  
  // 4. Prepend 0 if starts with 5 (mobile number without 0)
  if (/^5\d/.test(phone)) {
    phone = '0' + phone;
  }
  
  return phone;
};

/**
 * Validate Israeli phone number
 * Israeli mobile: 05X-XXXXXXX (10 digits starting with 05)
 * Israeli landline: 0X-XXXXXXX (9-10 digits)
 */
export const isValidIsraeliPhone = (phone: string): boolean => {
  const sanitized = sanitizeIsraeliPhone(phone);
  // Israeli mobile: 05X-XXXXXXX (10 digits starting with 05)
  // Israeli landline: 0X-XXXXXXX (9-10 digits)
  return /^0[234578]\d{7,8}$/.test(sanitized);
};

/**
 * Format phone for display
 * Converts 0501234567 to 050-1234567
 */
export const formatPhoneDisplay = (phone: string): string => {
  const sanitized = sanitizeIsraeliPhone(phone);
  if (sanitized.length === 10 && sanitized.startsWith('0')) {
    return `${sanitized.slice(0, 3)}-${sanitized.slice(3)}`;
  }
  return sanitized;
};
