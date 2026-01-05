import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { ConfigProvider, theme, Layout } from "antd";
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
import Splash from "./components/Splash";
import { userCacheVar, isApplicationLoading } from "./cache/userCacheVar";
import { useReactiveVar, useApolloClient } from "@apollo/client";
import notificationService from "./services/NotificationService";
import { useTaskNotifications } from "./hooks/useTaskNotifications";
import { useElectron, useSplashScreen } from "./hooks/useElectron";
import { initWebSocketManager, cleanupWebSocketManager } from "./apolloClient";

const { defaultAlgorithm } = theme;

function AppContent() {
  const loading = useReactiveVar(isApplicationLoading); // Use cache variable instead of auth context
  const [currentTheme] = useState("light");
  const user = useReactiveVar(userCacheVar);
  const { effectiveLayout } = useViewMode();
  const client = useApolloClient();
  const navigate = useNavigate();
  
  // Direct check before hook
  console.log('[AppContent] window.electron at render:', window.electron);
  console.log('[AppContent] window.electron.isElectron:', window.electron?.isElectron);
  
  const isElectron = useElectron();
  console.log('[AppContent] useElectron() returned:', isElectron);
  
  const { showSplash, setShowSplash } = useSplashScreen();
  
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

  // Register push notifications on login (skip in Electron - uses native notifications)
  useEffect(() => {
    console.log('[App] Push registration check - user:', !!user, 'isElectron:', isElectron, 'window.electron:', !!window.electron, 'window.isElectron:', !!window.isElectron);
    const electronEnv =
      isElectron ||
      !!window.electron ||
      !!window.isElectron ||
      !!window.process?.versions?.electron ||
      (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent));
    
    if (user && !electronEnv) {
      console.log('[App] Registering web push subscription');
      notificationService.registerPushSubscription(client);
    } else if (user && electronEnv) {
      console.log('[App] Skipping web push registration - using Electron native notifications');
    }
  }, [user, client, isElectron]);

  // Re-check and re-register push subscription periodically and on focus (skip in Electron)
  useEffect(() => {
    if (!user || isElectron || window.electron || window.isElectron || window.process?.versions?.electron) return;

    const checkAndReregister = async () => {
      // Double-check we're not in Electron (check both hook state and window.electron)
      if (isElectron || window.electron || window.isElectron || window.process?.versions?.electron) {
        console.log('[App] Skipping push check - running in Electron');
        return;
      }
      
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
      // Skip entirely if in Electron
      if (window.electron || isElectron) {
        console.log('[App] Skipping focus check - running in Electron');
        return;
      }
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
      const handleServiceWorkerMessage = (event) => {
        console.log('[App] Received message from service worker:', event.data);
        
        if (event.data.type === 'NAVIGATE_TO_URL' && event.data.url) {
          // Handle navigation when notification is clicked
          console.log('[App] Navigating to:', event.data.url);
          const urlObj = new URL(event.data.url, window.location.origin);
          const path = urlObj.pathname + urlObj.search + urlObj.hash;
          navigate(path);
        } else if (event.data.type === 'OPEN_CHAT' && event.data.roomId) {
          // Legacy handler for backward compatibility
          console.log('[App] Should open chat room:', event.data.roomId);
          navigate(`/messages?room=${event.data.roomId}`);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, [navigate]);

  // Listen for Electron IPC messages (e.g., notification clicks)
  useEffect(() => {
    if (window.electron?.onNavigateTo) {
      const handleNavigateTo = (url) => {
        console.log('[App] Electron navigate-to received:', url);
        if (url) {
          // Handle absolute URLs or paths
          try {
            const urlObj = new URL(url, window.location.origin);
            const path = urlObj.pathname + urlObj.search + urlObj.hash;
            navigate(path);
          } catch (e) {
            // If URL parsing fails, treat as a path
            navigate(url);
          }
        }
      };

      window.electron.onNavigateTo(handleNavigateTo);
    }
  }, [navigate]);

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

  if (showSplash) {
    return <Splash onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm:
          currentTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
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
                      onClick={() => navigate("/login")}
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
  const RouterComponent =
    typeof window !== "undefined" &&
    (window.electron || window.isElectron || window.process?.versions?.electron)
      ? HashRouter
      : BrowserRouter;

  return (
    <RouterComponent>
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
    </RouterComponent>
  );
}

export default App;
