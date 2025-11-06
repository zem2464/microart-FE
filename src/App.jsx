import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import BackOfficeLayout from "./layouts/BackOfficeLayout";
import FrontOfficeLayout from "./layouts/FrontOfficeLayout";
import Login from "./pages/Login";
import SetInitialPassword from "./pages/SetInitialPassword";
import ChangeExpirePassword from "./pages/ChangeExpirePassword";
import { AuthProvider } from "./contexts/AuthContext";
import { ViewModeProvider, useViewMode } from "./contexts/ViewModeContext";
import { AppDrawerProvider } from "./contexts/DrawerContext";
import { userCacheVar, isApplicationLoading } from "./cache/userCacheVar";
import { useReactiveVar } from "@apollo/client";

const { defaultAlgorithm } = theme;

function AppContent() {
  const loading = useReactiveVar(isApplicationLoading); // Use cache variable instead of auth context
  const [currentTheme] = useState("light");
  const user = useReactiveVar(userCacheVar);
  const { effectiveLayout } = useViewMode();
  
  console.log(user);
  
  // Determine layout based on view mode preference
  const getLayoutComponent = () => {
    if (!user) return null;
    
    // Use the effective layout from ViewModeContext
    if (effectiveLayout === 'backoffice') {
      return BackOfficeLayout;
    }
    if (effectiveLayout === 'frontoffice') {
      return FrontOfficeLayout;
    }
    
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
        algorithm:
          currentTheme === "dark" ? theme.darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: "#3b82f6",
          borderRadius: 6,
        },
      }}
    >
      <Routes>
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" />}
        />
        <Route
          path="/set-initial-password"
          element={!user ? <SetInitialPassword /> : <Navigate to="/" />}
        />
        <Route
          path="/change-expire-password"
          element={!user ? <ChangeExpirePassword /> : <Navigate to="/" />}
        />
        <Route
          path="/*"
          element={
            user && LayoutComponent ? (
              <LayoutComponent />
            ) : user ? (
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                  <p className="text-gray-600 mb-4">
                    You don't have permission to access this system.
                  </p>
                  <button
                    onClick={() => (window.location.href = "/login")}
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
    </ConfigProvider>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ViewModeProvider>
          <AppDrawerProvider>
            <AppContent />
          </AppDrawerProvider>
        </ViewModeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
