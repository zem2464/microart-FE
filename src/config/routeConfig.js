import { lazy } from 'react';
import { MODULES, ACTIONS, generatePermission } from './permissions';
import { BACKOFFICE_ROUTES, FRONTOFFICE_ROUTES } from './routes';

// Lazy load page components for better performance
const Dashboard = lazy(() => import('../pages/BackOffice/Dashboard'));
const Users = lazy(() => import('../pages/BackOffice/Users'));
const Reports = lazy(() => import('../pages/BackOffice/Reports'));
const Settings = lazy(() => import('../pages/BackOffice/Settings'));
const TaskTypes = lazy(() => import('../pages/BackOffice/TaskTypes'));
const WorkTypes = lazy(() => import('../pages/BackOffice/WorkTypes'));
const Gradings = lazy(() => import('../pages/BackOffice/Gradings'));
const Roles = lazy(() => import('../pages/BackOffice/Roles'));
const AuditLogs = lazy(() => import('../pages/BackOffice/AuditLogs'));
const PaymentTypes = lazy(() => import('../pages/BackOffice/PaymentTypes'));
const UserGradingRateManagement = lazy(() => import('../pages/Admin/UserGradingRateManagement'));
const HolidayManagement = lazy(() => import('../pages/BackOffice/HolidayManagement'));
const SalaryManagement = lazy(() => import('../pages/BackOffice/SalaryManagement'));
const Finance = lazy(() => import('../pages/BackOffice/Finance'));
const BackOfficeReminders = lazy(() => import('../pages/BackOffice/Reminders'));

const FrontOfficeDashboard = lazy(() => import('../pages/FrontOffice/Dashboard'));
const TaskTable = lazy(() => import('../pages/FrontOffice/TaskTable'));
const ProjectManagement = lazy(() => import('../pages/FrontOffice/ProjectManagement'));
const ClientDashboard = lazy(() => import('../pages/FrontOffice/ClientDashboard'));
const ClientList = lazy(() => import('../pages/FrontOffice/ClientList'));
const LedgerReport = lazy(() => import('../pages/FrontOffice/LedgerReport'));
const Transactions = lazy(() => import('../pages/FrontOffice/Transactions'));
const UserDashboard = lazy(() => import('../pages/FrontOffice/UserDashboard'));
const Messages = lazy(() => import('../pages/FrontOffice/Messages'));
const MyLeaves = lazy(() => import('../pages/FrontOffice/MyLeaves'));
const LeaveApprovals = lazy(() => import('../pages/FrontOffice/LeaveApprovals'));
const AllUsersLeaves = lazy(() => import('../pages/FrontOffice/AllUsersLeaves'));
const FrontOfficeReminders = lazy(() => import('../pages/FrontOffice/Reminders'));

/**
 * Back Office Route Configuration
 * Each route includes:
 * - path: Route path
 * - element: Component to render
 * - title: Page title
 * - permission: Required permission (optional)
 * - exact: Whether to match the path exactly
 */
export const backOfficeRoutes = [
  {
    path: BACKOFFICE_ROUTES.DASHBOARD,
    element: Dashboard,
    title: 'Dashboard',
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.REMINDERS,
    element: BackOfficeReminders,
    title: 'Reminders',
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.TASK_TYPES,
    element: TaskTypes,
    title: 'Task Types',
    permission: generatePermission(MODULES.TASK_TYPES, ACTIONS.MANAGE),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.WORK_TYPES,
    element: WorkTypes,
    title: 'Work Types',
    permission: generatePermission(MODULES.WORK_TYPES, ACTIONS.MANAGE),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.GRADINGS,
    element: Gradings,
    title: 'Gradings',
    permission: generatePermission(MODULES.GRADINGS, ACTIONS.MANAGE),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.FINANCE,
    element: Finance,
    title: 'Finance',
    permission: generatePermission(MODULES.FINANCE, ACTIONS.READ),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.PAYMENT_TYPES,
    element: PaymentTypes,
    title: 'Payment Types',
    permission: generatePermission(MODULES.FINANCE, ACTIONS.MANAGE),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.USERS,
    element: Users,
    title: 'Users',
    permission: generatePermission(MODULES.USERS, ACTIONS.MANAGE),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.ROLES,
    element: Roles,
    title: 'Roles',
    permission: generatePermission(MODULES.ROLES, ACTIONS.MANAGE),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.AUDIT_LOGS,
    element: AuditLogs,
    title: 'Audit Logs',
    permission: generatePermission(MODULES.AUDIT_LOGS, ACTIONS.MANAGE),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.USER_RATES,
    element: UserGradingRateManagement,
    title: 'User Grading Rates',
    permission: generatePermission(MODULES.USERS, ACTIONS.MANAGE),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.HOLIDAYS,
    element: HolidayManagement,
    title: 'Holiday Management',
    permission: generatePermission(MODULES.USERS, ACTIONS.MANAGE),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.SALARY_MANAGEMENT,
    element: SalaryManagement,
    title: 'Salary Management',
    permission: generatePermission(MODULES.FINANCE, ACTIONS.MANAGE),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.REPORTS,
    element: Reports,
    title: 'Reports',
    permission: generatePermission(MODULES.REPORTS, ACTIONS.MANAGE),
    exact: true,
  },
  {
    path: BACKOFFICE_ROUTES.SETTINGS,
    element: Settings,
    title: 'Settings',
    exact: true,
  },
];

/**
 * Front Office Route Configuration
 */
export const frontOfficeRoutes = [
  {
    path: FRONTOFFICE_ROUTES.DASHBOARD,
    element: FrontOfficeDashboard,
    title: 'Dashboard',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.TASKS,
    element: TaskTable,
    title: 'Tasks',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.PROJECTS,
    element: ProjectManagement,
    title: 'Projects',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.REMINDERS,
    element: FrontOfficeReminders,
    title: 'Reminders',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.TRANSACTIONS,
    element: Transactions,
    title: 'Transactions',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.LEDGER,
    element: LedgerReport,
    title: 'Ledger Report',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.USER_DASHBOARD,
    element: UserDashboard,
    title: 'User Dashboard',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.CLIENT_DASHBOARD,
    element: ClientDashboard,
    title: 'Client Dashboard',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.CLIENTS,
    element: ClientList,
    title: 'Clients',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.MESSAGES,
    element: Messages,
    title: 'Messages',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.MESSAGES_WITH_ROOM,
    element: Messages,
    title: 'Messages',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.LEAVES,
    element: MyLeaves,
    title: 'My Leaves',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.LEAVE_APPROVALS,
    element: LeaveApprovals,
    title: 'Leave Approvals',
    exact: true,
  },
  {
    path: FRONTOFFICE_ROUTES.ALL_USERS_LEAVES,
    element: AllUsersLeaves,
    title: 'All Users Leaves',
    exact: true,
  },
];

/**
 * Helper function to check if a path is valid for a given layout
 * @param {string} path - The path to check
 * @param {string} layout - The layout type ('backoffice' or 'frontoffice')
 * @returns {boolean} - True if path is valid for the layout
 */
export const isPathValidForLayout = (path, layout) => {
  const routes = layout === 'backoffice' ? backOfficeRoutes : frontOfficeRoutes;
  
  // Check if path matches any of the route paths
  return routes.some(route => {
    if (route.exact) {
      return path === route.path;
    }
    // Handle paths with dynamic segments (e.g., /path/:id)
    const pathRegex = new RegExp(`^${route.path.replace(/:[^\s/]+/g, '[^/]+')}(\\?.*)?$`);
    return pathRegex.test(path);
  });
};

/**
 * Get the default route for a layout
 * @param {string} layout - The layout type ('backoffice' or 'frontoffice')
 * @returns {string} - The default route path
 */
export const getDefaultRouteForLayout = (layout) => {
  if (layout === 'backoffice') {
    return BACKOFFICE_ROUTES.DASHBOARD;
  }
  return FRONTOFFICE_ROUTES.DASHBOARD;
};
