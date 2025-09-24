// Centralized permissions config for FE (HMS-FE style)
// Sync this with backend permissions.js

export const MODULES = {
  ROLES: 'roles',
  USERS: 'users',
  TASKS: 'tasks',
  AUDIT_LOGS: 'auditLogs',
  // Add other modules as needed
};

export const MODULE_ACTIONS = {
  roles: ['create', 'read', 'update', 'delete'],
  users: ['create', 'read', 'update', 'delete'],
  tasks: ['create', 'read', 'update', 'delete'],
  auditLogs: ['read'],
  // Add other actions as needed
};

export function generatePermission(module, action) {
  return `${module}.${action}`;
}

export function hasPermission(user, permission) {
  if (!user || !user.role || !Array.isArray(user.role.permissions)) return false;
  return user.role.permissions.includes(permission);
}

export function hasAnyPermission(user, permissions) {
  if (!user || !user.role || !Array.isArray(user.role.permissions)) return false;
  return permissions.some((perm) => user.role.permissions.includes(perm));
}

export function hasAllPermissions(user, permissions) {
  if (!user || !user.role || !Array.isArray(user.role.permissions)) return false;
  return permissions.every((perm) => user.role.permissions.includes(perm));
}
