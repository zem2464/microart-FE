/**
 * Date Formatting Utilities
 * Centralized date/time formatting functions for consistent display across the application
 */

/**
 * Format date to a readable string
 * @param {string|Date} date - Date string or Date object
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      ...options
    };
    
    return dateObj.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date with time to a readable string
 * @param {string|Date} date - Date string or Date object
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date, options = {}) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options
    };
    
    return dateObj.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    console.error('DateTime formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format time only
 * @param {string|Date} date - Date string or Date object
 * @param {Object} options - Formatting options
 * @returns {string} Formatted time string
 */
export const formatTime = (date, options = {}) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return 'Invalid Time';
    
    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options
    };
    
    return dateObj.toLocaleTimeString('en-US', defaultOptions);
  } catch (error) {
    console.error('Time formatting error:', error);
    return 'Invalid Time';
  }
};

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);
    
    // Define time intervals in seconds
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'week', seconds: 604800 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
      { label: 'second', seconds: 1 }
    ];
    
    for (const interval of intervals) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      if (count >= 1) {
        return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
      }
    }
    
    return 'Just now';
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date for API usage (ISO string)
 * @param {string|Date} date - Date string or Date object
 * @returns {string} ISO date string
 */
export const formatForAPI = (date) => {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return null;
    
    return dateObj.toISOString();
  } catch (error) {
    console.error('API date formatting error:', error);
    return null;
  }
};

/**
 * Check if a date is today
 * @param {string|Date} date - Date string or Date object
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    
    return dateObj.toDateString() === today.toDateString();
  } catch (error) {
    return false;
  }
};

/**
 * Check if a date is yesterday
 * @param {string|Date} date - Date string or Date object
 * @returns {boolean} True if date is yesterday
 */
export const isYesterday = (date) => {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return dateObj.toDateString() === yesterday.toDateString();
  } catch (error) {
    return false;
  }
};

/**
 * Smart date formatting that shows relative time for recent dates
 * and absolute dates for older ones
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Smart formatted date string
 */
export const formatSmartDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isToday(dateObj)) {
      return `Today, ${formatTime(dateObj)}`;
    }
    
    if (isYesterday(dateObj)) {
      return `Yesterday, ${formatTime(dateObj)}`;
    }
    
    const now = new Date();
    const diffInDays = Math.floor((now - dateObj) / (1000 * 60 * 60 * 24));
    
    // Show relative time for dates within the last week
    if (diffInDays <= 7) {
      return formatRelativeTime(dateObj);
    }
    
    // Show absolute date for older dates
    return formatDateTime(dateObj);
  } catch (error) {
    console.error('Smart date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date range
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {string} Formatted date range string
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return 'N/A';
  if (!startDate) return `Until ${formatDate(endDate)}`;
  if (!endDate) return `From ${formatDate(startDate)}`;
  
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  
  return `${start} - ${end}`;
};

// Export all functions as default object for easier importing
const dateUtils = {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatForAPI,
  formatSmartDate,
  formatDateRange,
  isToday,
  isYesterday
};

export default dateUtils;