import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import BackOfficeLayout from './layouts/BackOfficeLayout';
import FrontOfficeLayout from './layouts/FrontOfficeLayout';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const { defaultAlgorithm } = theme;

function AppContent() {
  const { user, loading } = useAuth();
  const [currentTheme] = useState('light');

  // Determine layout based on user role
  const getLayoutComponent = () => {
    if (!user) return null;
    
    const role = user.role?.name?.toLowerCase();
    
    // BackOffice for Admin and Manager roles
    if (role === 'admin' || role === 'manager') {
      return BackOfficeLayout;
    }
    
    // FrontOffice for Employee role only
    if (role === 'employee') {
      return FrontOfficeLayout;
    }
    
    // No access for other roles
    return null;
  };

  const LayoutComponent = getLayoutComponent();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          borderRadius: 6,
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route 
            path="/*" 
            element={
              user && LayoutComponent ? (
                <LayoutComponent />
              ) : user ? (
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                    <p className="text-gray-600 mb-4">You don't have permission to access this system.</p>
                    <button 
                      onClick={() => window.location.href = '/login'}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Return to Login
                    </button>
                  </div>
                </div>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;