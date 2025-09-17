import React, { createContext, useContext, useState, useEffect } from 'react';
import { useReactiveVar } from '@apollo/client';
import { userCacheVar } from '../cache/userCacheVar';

const ViewModeContext = createContext();

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};

export const ViewModeProvider = ({ children }) => {
  const user = useReactiveVar(userCacheVar);
  const [viewMode, setViewMode] = useState('auto'); // 'backoffice', 'frontoffice', or 'auto'
  
  // Persist view mode preference in localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('viewMode');
    if (savedViewMode && ['backoffice', 'frontoffice', 'auto'].includes(savedViewMode)) {
      setViewMode(savedViewMode);
    }
  }, []);

  const updateViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

  // Determine the effective layout based on user role and preference
  const getEffectiveLayout = () => {
    if (!user) return null;
    
    const role = user.role?.name?.toLowerCase();
    
    // Non-admin users are restricted to their designated layouts
    if (role === 'employee') {
      return 'frontoffice';
    }
    if (role === 'manager') {
      return 'backoffice';
    }
    
    // Admin users can choose their view
    if (role === 'admin') {
      if (viewMode === 'auto') {
        return 'backoffice'; // Default to backoffice for admin
      }
      return viewMode;
    }
    
    return null;
  };

  // Check if current user can switch views (only admin)
  const canSwitchViews = () => {
    return user?.role?.name?.toLowerCase() === 'admin';
  };

  const value = {
    viewMode,
    setViewMode: updateViewMode,
    effectiveLayout: getEffectiveLayout(),
    canSwitchViews: canSwitchViews(),
    toggleView: () => {
      if (canSwitchViews()) {
        const newMode = viewMode === 'backoffice' ? 'frontoffice' : 'backoffice';
        updateViewMode(newMode);
      }
    }
  };

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
};

export default ViewModeContext;