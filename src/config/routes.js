/**
 * Route Path Constants
 * Centralized route paths for the application
 */

// Auth Routes
export const AUTH_ROUTES = {
  LOGIN: '/login',
  SET_INITIAL_PASSWORD: '/set-initial-password',
  CHANGE_EXPIRE_PASSWORD: '/change-expire-password',
};

// Back Office Routes
export const BACKOFFICE_ROUTES = {
  DASHBOARD: '/',
  REMINDERS: '/reminders',
  TASK_TYPES: '/task-types',
  WORK_TYPES: '/work-types',
  GRADINGS: '/gradings',
  FINANCE: '/finance',
  PAYMENT_TYPES: '/payment-types',
  USERS: '/users',
  ROLES: '/roles',
  AUDIT_LOGS: '/audit-logs',
  USER_RATES: '/user-rates',
  HOLIDAYS: '/holidays',
  SALARY_MANAGEMENT: '/salary-management',
  REPORTS: '/reports',
  SETTINGS: '/settings',
};

// Front Office Routes
export const FRONTOFFICE_ROUTES = {
  TASKS: '/',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  DELETED_PROJECTS: '/projects/deleted',
  REMINDERS: '/reminders',
  TRANSACTIONS: '/transactions',
  LEDGER: '/ledger',
  USER_DASHBOARD: '/user-dashboard',
  CLIENT_DASHBOARD: '/clients/dashboard',
  CLIENTS: '/clients',
  MESSAGES: '/messages',
  MESSAGES_WITH_ROOM: '/messages/:roomId',
  LEAVES: '/leaves',
  LEAVE_APPROVALS: '/leave-approvals',
  ALL_USERS_LEAVES: '/all-users-leaves',
};

// Helper function to get all routes
export const getAllRoutes = () => ({
  ...AUTH_ROUTES,
  ...BACKOFFICE_ROUTES,
  ...FRONTOFFICE_ROUTES,
});
