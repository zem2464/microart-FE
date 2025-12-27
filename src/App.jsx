import React, { useState, useEffect } from "react";
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
import { PaymentProvider } from "./contexts/PaymentContext";
import { ChatProvider } from "./contexts/ChatContext";
import ChatFooter from "./components/Chat/ChatFooter";
import RecordPaymentModal from "./components/RecordPaymentModal";
import { userCacheVar, isApplicationLoading } from "./cache/userCacheVar";
import { useReactiveVar, useApolloClient } from "@apollo/client";
import notificationService from "./services/NotificationService";
import { useTaskNotifications } from "./hooks/useTaskNotifications";
import { initWebSocketManager, cleanupWebSocketManager } from "./apolloClient";

const { defaultAlgorithm } = theme;

function AppContent() {
  const loading = useReactiveVar(isApplicationLoading); // Use cache variable instead of auth context
  const [currentTheme] = useState("light");
  const user = useReactiveVar(userCacheVar);
  const { effectiveLayout } = useViewMode();
  const client = useApolloClient();
  
  // Listen for task assignment notifications
  useTaskNotifications();

  // Initialize WebSocket Manager for visibility tracking and heartbeat monitoring
  useEffect(() => {
    if (user) {
      initWebSocketManager();
      console.log('[App] WebSocket Manager initialized for user:', user.email);
      
      return () => {
        cleanupWebSocketManager();
        console.log('[App] WebSocket Manager cleaned up');
      };
    }
  }, [user]);

  // Register push notifications on login
  useEffect(() => {
    if (user) {
      notificationService.registerPushSubscription(client);
    }
  }, [user, client]);

  // Re-check and re-register push subscription periodically and on focus
  useEffect(() => {
    if (!user) return;

    const checkAndReregister = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          console.log('[App] Push subscription missing, re-registering...');
          await notificationService.registerPushSubscription(client);
        }
      } catch (error) {
        console.error('[App] Error checking subscription:', error);
      }
    };

    // Check when app regains focus
    const handleFocus = () => {
      console.log('[App] App gained focus, checking subscription...');
      checkAndReregister();
    };

    window.addEventListener('focus', handleFocus);

    // Also check periodically (every 5 minutes)
    const intervalId = setInterval(checkAndReregister, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [user, client]);

  // Listen for service worker messages (e.g., notification clicks)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[App] Received message from service worker:', event.data);
        
        if (event.data.type === 'OPEN_CHAT' && event.data.roomId) {
          // Handle opening chat when notification is clicked
          // This could be expanded to navigate to the chat room
          console.log('[App] Should open chat room:', event.data.roomId);
        }
      });
    }
  }, []);

  console.log(user);

  // Determine layout based on view mode preference
  const getLayoutComponent = () => {
    if (!user) return null;
    console.log("Effective Layout:", effectiveLayout);
    // Use the effective layout from ViewModeContext
    if (effectiveLayout === "backoffice") {
      return BackOfficeLayout;
    }
    if (effectiveLayout === "frontoffice") {
      return FrontOfficeLayout;
    }

    return FrontOfficeLayout;
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
      <ChatFooter />
    </ConfigProvider>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ViewModeProvider>
          <AppDrawerProvider>
            <PaymentProvider>
              <ChatProvider>
                <AppContent />
                <RecordPaymentModal />
              </ChatProvider>
            </PaymentProvider>
          </AppDrawerProvider>
        </ViewModeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
