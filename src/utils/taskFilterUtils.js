/**
 * Task Table Filter Persistence Utilities
 * Handles saving and retrieving filter states from cookies
 */

import { getCookie, setCookie, clearCookie } from './cookieUtils';

const TASK_FILTER_COOKIE_NAME = 'taskTableFilters';
const TASK_FILTER_COOKIE_EXPIRY = 30; // 30 days

/**
 * Get all filter values for TaskTable from cookies
 * @returns {Object} Filter state object with all filter values
 */
export const getTaskFiltersFromCookie = () => {
  try {
    const filtersCookie = getCookie(TASK_FILTER_COOKIE_NAME);
    if (!filtersCookie) {
      return getDefaultFilters();
    }

    const filters = JSON.parse(filtersCookie);
    return {
      searchText: filters.searchText || "",
      clientSearch: filters.clientSearch || "",
      userFilter: filters.userFilter || "all",
      priorityFilter: filters.priorityFilter || "all",
      selectedWorkTypeId: filters.selectedWorkTypeId || "all",
      gradingFilter: filters.gradingFilter || "all",
      sortBy: filters.sortBy || "createdAt",
      sortOrder: filters.sortOrder || "DESC",
      myClientsOnly: filters.myClientsOnly || false,
    };
  } catch (error) {
    console.error('Error retrieving task filters from cookie:', error);
    return getDefaultFilters();
  }
};

/**
 * Save filter state to cookies
 * @param {Object} filters - Filter state object
 */
export const saveTaskFiltersToCookie = (filters) => {
  try {
    const filterData = {
      searchText: filters.searchText || "",
      clientSearch: filters.clientSearch || "",
      userFilter: filters.userFilter || "all",
      priorityFilter: filters.priorityFilter || "all",
      selectedWorkTypeId: filters.selectedWorkTypeId || "all",
      gradingFilter: filters.gradingFilter || "all",
      sortBy: filters.sortBy || "createdAt",
      sortOrder: filters.sortOrder || "DESC",
      myClientsOnly: filters.myClientsOnly || false,
    };

    setCookie(
      TASK_FILTER_COOKIE_NAME,
      JSON.stringify(filterData),
      TASK_FILTER_COOKIE_EXPIRY
    );

    console.log('[TaskFilterUtils] Filters saved to cookie:', filterData);
  } catch (error) {
    console.error('Error saving task filters to cookie:', error);
  }
};

/**
 * Clear task filter cookies
 */
export const clearTaskFiltersCookie = () => {
  try {
    clearCookie(TASK_FILTER_COOKIE_NAME);
    console.log('[TaskFilterUtils] Task filter cookie cleared');
  } catch (error) {
    console.error('Error clearing task filters cookie:', error);
  }
};

/**
 * Get default filter values
 * @returns {Object} Default filter state
 */
export const getDefaultFilters = () => {
  return {
    searchText: "",
    clientSearch: "",
    userFilter: "all",
    priorityFilter: "all",
    selectedWorkTypeId: "all",
    gradingFilter: "all",
    sortBy: "createdAt",
    sortOrder: "DESC",
    myClientsOnly: false,
  };
};

export default {
  getTaskFiltersFromCookie,
  saveTaskFiltersToCookie,
  clearTaskFiltersCookie,
  getDefaultFilters,
};
