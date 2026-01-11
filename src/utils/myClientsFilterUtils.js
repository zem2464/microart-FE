/**
 * My Clients Filter Persistence Utilities
 * Handles saving and retrieving "My Clients Only" filter state from cookies
 * Used across ClientList, ClientDashboard, ProjectManagement, TaskTable, and BackOffice ProjectList
 */

import { getCookie, setCookie, clearCookie } from './cookieUtils';

const MY_CLIENTS_FILTER_COOKIE_NAME = 'myClientsOnlyFilter';
const MY_CLIENTS_FILTER_COOKIE_EXPIRY = 365; // 365 days (1 year)

/**
 * Get the "My Clients Only" filter value from cookies
 * @param {boolean} isServiceProvider - Whether the current user is a service provider
 * @returns {boolean} - The filter state (true for "My Clients Only", false for "All Clients")
 */
export const getMyClientsFilterFromCookie = (isServiceProvider = false) => {
  try {
    const filterValue = getCookie(MY_CLIENTS_FILTER_COOKIE_NAME);
    
    // If no cookie exists, default based on user type
    if (filterValue === null || filterValue === undefined) {
      // Service providers default to true (My Clients Only)
      // Others default to false (All Clients)
      return isServiceProvider === true;
    }
    
    // Parse the cookie value (handles both string "true"/"false" and boolean)
    return filterValue === 'true' || filterValue === true;
  } catch (error) {
    console.error('[MyClientsFilterUtils] Error retrieving filter from cookie:', error);
    // Fallback to service provider default on error
    return isServiceProvider === true;
  }
};

/**
 * Save the "My Clients Only" filter state to cookies
 * @param {boolean} myClientsOnly - The filter state to save
 */
export const saveMyClientsFilterToCookie = (myClientsOnly) => {
  try {
    const filterValue = myClientsOnly === true ? 'true' : 'false';
    setCookie(
      MY_CLIENTS_FILTER_COOKIE_NAME,
      filterValue,
      MY_CLIENTS_FILTER_COOKIE_EXPIRY
    );
    console.log('[MyClientsFilterUtils] Filter saved to cookie:', filterValue);
  } catch (error) {
    console.error('[MyClientsFilterUtils] Error saving filter to cookie:', error);
  }
};

/**
 * Clear the "My Clients Only" filter cookie
 */
export const clearMyClientsFilterCookie = () => {
  try {
    clearCookie(MY_CLIENTS_FILTER_COOKIE_NAME);
    console.log('[MyClientsFilterUtils] My Clients filter cookie cleared');
  } catch (error) {
    console.error('[MyClientsFilterUtils] Error clearing filter cookie:', error);
  }
};
