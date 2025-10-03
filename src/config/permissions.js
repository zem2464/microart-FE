/**
 * Centralized Permissions Configuration - Frontend
 * This file defines all modules and their available actions in the system
 * MUST BE KEPT IN SYNC with backend/src/config/permissions.js
 */

// Define available actions for any module
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read', 
  UPDATE: 'update',
  DELETE: 'delete',
  REORDER: 'reorder',
  IMPORT: 'import',
  EXPORT: 'export',
  APPROVE: 'approve',
  REJECT: 'reject'
};

// Define all modules in the system (matching backend)
export const MODULES = {
  USERS: 'users',
  ROLES: 'roles', 
  PROJECTS: 'projects',
  TASKS: 'tasks',
  TASK_TYPES: 'taskTypes',
  WORK_TYPES: 'workTypes',
  GRADINGS: 'gradings',
  PACKAGES: 'packages',
  CLIENTS: 'clients',
  CLIENT_LOCATIONS: 'clientLocations',
  CLIENT_TRANSACTIONS: 'clientTransactions',
  CLIENT_CONFIGURATIONS: 'clientConfigurations',
  REPORTS: 'reports',
  AUDIT_LOGS: 'auditLogs'
};

// Define which actions are available for each module (matching backend)
export const MODULE_ACTIONS = {
  [MODULES.USERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.IMPORT, ACTIONS.EXPORT],
  [MODULES.ROLES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
  [MODULES.PROJECTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.APPROVE, ACTIONS.REJECT],
  [MODULES.TASKS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.REORDER],
  [MODULES.TASK_TYPES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.REORDER],
  [MODULES.WORK_TYPES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.REORDER],
  [MODULES.GRADINGS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
  [MODULES.PACKAGES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
  [MODULES.CLIENTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.IMPORT, ACTIONS.EXPORT],
  [MODULES.CLIENT_LOCATIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.IMPORT, ACTIONS.EXPORT],
  [MODULES.CLIENT_TRANSACTIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.EXPORT],
  [MODULES.CLIENT_CONFIGURATIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
  [MODULES.REPORTS]: [ACTIONS.READ, ACTIONS.EXPORT],
  [MODULES.AUDIT_LOGS]: [ACTIONS.READ, ACTIONS.EXPORT]
};

export function generatePermission(module, action) {
  return `${module}.${action}`;
}

export function hasPermission(user, permission) {
  if (!user) {
    return false;
  }
  
  if (!user.role) {
    return false;
  }
  
  if (!user.role.permissions) {
    return false;
  }
  
  // Parse permission string (e.g., "workTypes.read" -> module: "workTypes", action: "create")
  const [module, action] = permission.split('.');
  
  // Check if module exists and action is allowed
  const modulePermissions = user.role.permissions[module];
  
  if (!modulePermissions) {
    return false;
  }
  
  const hasAccess = modulePermissions[action] === true;
  
  // TEMPORARY: Override for admin user and workTypes
  if (user.email === 'admin@microart.com' && module === 'workTypes') {
    return true;
  }
  
  return hasAccess;
}

export function hasAnyPermission(user, permissions) {
  if (!user || !user.role || !user.role.permissions) return false;
  return permissions.some((perm) => hasPermission(user, perm));
}

export function hasAllPermissions(user, permissions) {
  if (!user || !user.role || !user.role.permissions) return false;
  return permissions.every((perm) => hasPermission(user, perm));
}
