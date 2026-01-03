/**
 * User Avatar Utility Functions
 */

/**
 * Generate initials from user name
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @returns {string} - Initials (e.g., "JD" for John Doe)
 */
export const getInitials = (firstName = '', lastName = '') => {
  const first = firstName?.trim()?.[0]?.toUpperCase() || '';
  const last = lastName?.trim()?.[0]?.toUpperCase() || '';
  return (first + last) || '?';
};

/**
 * Get a color for the avatar background based on initials/name
 * Generates consistent color for the same name
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @returns {string} - Hex color code
 */
export const getAvatarColor = (firstName = '', lastName = '') => {
  const name = (firstName + lastName).toLowerCase();
  const colors = [
    '#f56565', // red
    '#ed8936', // orange
    '#ecc94b', // yellow
    '#48bb78', // green
    '#38b2ac', // teal
    '#4299e1', // blue
    '#9f7aea', // purple
    '#ed64a6', // pink
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

/**
 * Get full name from first and last name
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @returns {string} - Full name
 */
export const getFullName = (firstName = '', lastName = '') => {
  return `${firstName} ${lastName}`.trim();
};
