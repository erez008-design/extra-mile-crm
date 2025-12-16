/**
 * Safari-safe date parsing utility.
 * Safari has issues with certain date formats that other browsers handle.
 * This function ensures dates are parsed consistently across all browsers.
 */
export function safeParseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    // First, try parsing as-is (works for ISO 8601 format)
    let date = new Date(dateString);
    
    // Check if the date is valid
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Safari doesn't support dates with spaces instead of 'T' separator
    // Try replacing space with 'T' for ISO-like formats
    if (dateString.includes(' ') && !dateString.includes('T')) {
      const isoString = dateString.replace(' ', 'T');
      date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try parsing common date-only formats (YYYY-MM-DD)
    const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // If all else fails, return null rather than an invalid date
    console.warn('Could not parse date:', dateString);
    return null;
  } catch (error) {
    console.warn('Error parsing date:', dateString, error);
    return null;
  }
}

/**
 * Format a date string safely for display.
 * Returns a fallback string if the date cannot be parsed.
 */
export function safeDateDisplay(
  dateString: string | null | undefined, 
  formatter: (date: Date) => string,
  fallback: string = '—'
): string {
  const date = safeParseDate(dateString);
  if (!date) return fallback;
  
  try {
    return formatter(date);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return fallback;
  }
}
