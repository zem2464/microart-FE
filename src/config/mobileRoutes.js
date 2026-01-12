/**
 * Mobile Routes Configuration
 * Restricted routes for mobile-only users
 * 
 * Mobile users can only access:
 * 1. Chat
 * 2. Reminders
 * 3. Projects (View only)
 * 4. Clients (View only)
 * 5. All available reports
 */

// Mobile specific route paths
export const MOBILE_ROUTES = {
  CHAT: '/mobile/chat',
  CHAT_WITH_ROOM: '/mobile/chat/:roomId',
  REMINDERS: '/mobile/reminders',
  PROJECTS: '/mobile/projects',
  PROJECT_DETAIL: '/mobile/projects/:projectId',
  CLIENTS: '/mobile/clients',
  CLIENT_DETAIL: '/mobile/clients/:clientId',
  REPORTS: '/mobile/reports',
  REPORT_DETAIL: '/mobile/reports/:reportType',
  HOME: '/mobile',
};

/**
 * Check if a route is accessible on mobile
 * @param {string} path - The route path to check
 * @returns {boolean} - True if route is accessible on mobile
 */
export const isMobileRoute = (path) => {
  if (!path) return false;

  const mobileAccessibleRoutes = [
    '/mobile',
    '/mobile/chat',
    '/mobile/chat/',
    '/mobile/reminders',
    '/mobile/projects',
    '/mobile/clients',
    '/mobile/reports',
    '/messages', // Maps to chat
    '/reminders',
  ];

  // Check exact matches
  if (mobileAccessibleRoutes.includes(path)) return true;

  // Check patterns (with IDs)
  const patterns = [
    /^\/mobile\/chat\/[^/]+$/,
    /^\/mobile\/projects\/?$/,
    /^\/mobile\/projects\/[^/]+$/,
    /^\/mobile\/clients\/?$/,
    /^\/mobile\/clients\/[^/]+$/,
    /^\/mobile\/reports\/?$/,
    /^\/mobile\/reports\/[^/]+$/,
    /^\/messages\/[^/]+$/, // Chat with roomId
  ];

  return patterns.some(pattern => pattern.test(path));
};

/**
 * Get the home/default route for mobile users
 * @returns {string} - The default mobile route
 */
export const getMobileDefaultRoute = () => {
  return MOBILE_ROUTES.REMINDERS; // Default to reminders
};

/**
 * Redirect restricted route to mobile equivalent
 * @param {string} path - The desktop path
 * @returns {string|null} - The mobile equivalent path or null if no equivalent
 */
export const getMobileEquivalentRoute = (path) => {
  const routeMap = {
    '/messages': MOBILE_ROUTES.CHAT,
    '/reminders': MOBILE_ROUTES.REMINDERS,
    '/projects': MOBILE_ROUTES.PROJECTS,
    '/clients': MOBILE_ROUTES.CLIENTS,
    '/reports': MOBILE_ROUTES.REPORTS,
    '/': MOBILE_ROUTES.HOME,
  };

  // Check exact matches first
  if (routeMap[path]) return routeMap[path];

  // Check pattern matches
  if (path.match(/^\/messages\/[^/]+$/)) {
    const roomId = path.split('/').pop();
    return `${MOBILE_ROUTES.CHAT}/${roomId}`;
  }

  if (path.match(/^\/projects\/[^/]+$/)) {
    const projectId = path.split('/').pop();
    return `${MOBILE_ROUTES.PROJECTS}/${projectId}`;
  }

  if (path.match(/^\/clients\/[^/]+$/)) {
    const clientId = path.split('/').pop();
    return `${MOBILE_ROUTES.CLIENTS}/${clientId}`;
  }

  return null;
};

/**
 * List of all mobile allowed routes for reference
 */
export const MOBILE_ALLOWED_ROUTES = [
  MOBILE_ROUTES.HOME,
  MOBILE_ROUTES.CHAT,
  MOBILE_ROUTES.CHAT_WITH_ROOM,
  MOBILE_ROUTES.REMINDERS,
  MOBILE_ROUTES.PROJECTS,
  MOBILE_ROUTES.PROJECT_DETAIL,
  MOBILE_ROUTES.CLIENTS,
  MOBILE_ROUTES.CLIENT_DETAIL,
  MOBILE_ROUTES.REPORTS,
  MOBILE_ROUTES.REPORT_DETAIL,
  // Also include desktop routes that map to mobile
  '/messages',
  '/messages/:roomId',
  '/reminders',
];
