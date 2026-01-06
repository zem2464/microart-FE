import React, { Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { useReactiveVar } from '@apollo/client';
import { userCacheVar } from '../cache/userCacheVar';
import { hasPermission } from '../config/permissions';
import { Spin } from 'antd';

/**
 * PrivateRoute Component
 * Wraps routes that require authentication and optional permissions
 * 
 * Features:
 * - Redirects to login if user is not authenticated
 * - Checks for required permissions if specified
 * - Shows loading spinner while lazy-loading components
 * - Shows access denied for insufficient permissions
 */
const PrivateRoute = ({ element: Component, permission, title, ...rest }) => {
  const user = useReactiveVar(userCacheVar);

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If permission is required and user doesn't have it, show access denied
  if (permission && !hasPermission(user, permission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Render component with suspense for lazy loading
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Spin size="large" />
        </div>
      }
    >
      <Component />
    </Suspense>
  );
};

/**
 * Helper function to render routes from configuration
 * @param {Array} routes - Array of route configuration objects
 * @returns {Array} Array of Route components
 */
export const renderRoutes = (routes) => {
  return routes.map((route) => (
    <Route
      key={route.path}
      path={route.path}
      element={
        <PrivateRoute
          element={route.element}
          permission={route.permission}
          title={route.title}
        />
      }
    />
  ));
};

export default PrivateRoute;
