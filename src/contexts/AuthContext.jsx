import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useApolloClient, useLazyQuery, useMutation } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import {
  LOGIN_MUTATION,
  LOGOUT_QUERY,
  SET_INITIAL_PASSWORD_MUTATION,
} from "../gql/auth";
import { ME_QUERY } from "../gql/me";
import { REMOVE_PUSH_SUBSCRIPTION } from "../graphql/notifications";
import {
  isApplicationLoading,
  isLoggedIn,
  meUserData,
  userCacheVar,
} from "../cache/userCacheVar";
import { getDeviceRegistrationInfo } from "../utils/deviceDetection";
import { reconnectWebSocket } from "../apolloClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const client = useApolloClient();
  const [deviceError, setDeviceError] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);

  // Initialize device info on mount
  useEffect(() => {
    const initializeDeviceInfo = async () => {
      try {
        const info = await getDeviceRegistrationInfo();
        setDeviceInfo(info);
      } catch (error) {
        console.error("Error getting device info:", error);
        setDeviceError(error.message);
      }
    };

    initializeDeviceInfo();
  }, []);

  // Use ME query to check auth status
  const [fetchMe, { data: meResult, error: authError, loading: authLoading }] =
    useLazyQuery(ME_QUERY, {
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "cache-and-network", // Use cache-and-network for consistent performance
    });

  useEffect(() => {
    if (meResult && meResult.me) {
      isLoggedIn(true);
      meUserData(meResult.me);
      userCacheVar(meResult.me); // Also set userCacheVar for App.js routing
    }
  }, [meResult, authError]);

  const getMe = useCallback(async () => {
    try {
      await fetchMe();
    } catch (error) {
      console.error("Error fetching user data:", error);

      // Check if it's a device verification error
      const { graphQLErrors } = error;
      if (graphQLErrors) {
        for (const gqlError of graphQLErrors) {
          if (gqlError.extensions?.code === "DEVICE_NOT_AUTHORIZED") {
            // Device verification error - set device error but don't throw
            isLoggedIn(false);
            userCacheVar(null); // Also clear userCacheVar

            const deviceData = gqlError.extensions;
            setDeviceError({
              message: gqlError.message,
              deviceId: deviceData.deviceId,
              requiresRegistration: deviceData.requiresRegistration,
              requiresApproval: deviceData.requiresApproval,
            });
            return; // Don't throw error for device authorization issues
          }
        }
      }

      // For other errors, set logged out and throw error for checkAuth to handle
      isLoggedIn(false);
      userCacheVar(null); // Also clear userCacheVar
      throw error;
    }
  }, [fetchMe, setDeviceError]);

  // Check auth status on mount and route changes
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check if user is already logged in (to prevent unnecessary calls)
      if (isLoggedIn()) {
        isApplicationLoading(false);
        return;
      }

      try {
        await getMe();
        isApplicationLoading(false);
      } catch (error) {
        console.error("Error checking auth status:", error);

        // Check if it's a device verification error
        const { graphQLErrors } = error;
        if (graphQLErrors) {
          for (const gqlError of graphQLErrors) {
            if (gqlError.extensions?.code === "DEVICE_NOT_AUTHORIZED") {
              // Device verification error - don't redirect to login
              isLoggedIn(false);
              isApplicationLoading(false);

              // Set device error for the app to handle
              const deviceData = gqlError.extensions;
              setDeviceError({
                message: gqlError.message,
                deviceId: deviceData.deviceId,
                requiresRegistration: deviceData.requiresRegistration,
                requiresApproval: deviceData.requiresApproval,
              });
              return; // Don't navigate to login
            }
          }
        }

        // For other auth errors (invalid token, expired session, etc.)
        isLoggedIn(false);
        isApplicationLoading(false);

        // Only navigate to login if not already on login page or auth-related pages
        const currentPath = window.location.pathname;
        const authPages = [
          "/login",
          "/device-registration",
          "/set-initial-password",
          "/change-expire-password",
        ];
        if (!authPages.includes(currentPath)) {
          navigate("/login");
        }
      }
    };

    checkAuth();
  }, [getMe, navigate]);

  const [loginUser, { loading, error }] = useMutation(LOGIN_MUTATION, {
    refetchQueries: [{ query: ME_QUERY, fetchPolicy: "network-only" }],
    awaitRefetchQueries: true,
  });

  const [
    setInitialPasswordMutation,
    { loading: initialPasswordLoading, error: initialPasswordError },
  ] = useMutation(SET_INITIAL_PASSWORD_MUTATION);

  // Transform device info to match GraphQL schema
  const transformDeviceInfoForGraphQL = (deviceInfo) => {
    if (!deviceInfo) return null;

    // Handle screen information - could be object or string
    let screenInfo = null;
    if (deviceInfo.screen && typeof deviceInfo.screen === "object") {
      screenInfo = {
        width: deviceInfo.screen.width,
        height: deviceInfo.screen.height,
        colorDepth: deviceInfo.screen.colorDepth,
      };
    } else if (
      deviceInfo.screenResolution &&
      typeof deviceInfo.screenResolution === "string"
    ) {
      // Parse "1920x1080" format
      const [width, height] = deviceInfo.screenResolution
        .split("x")
        .map(Number);
      screenInfo = {
        width: width || window.screen.width,
        height: height || window.screen.height,
        colorDepth: window.screen.colorDepth || 24,
      };
    } else {
      // Fallback to window.screen
      screenInfo = {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth || 24,
      };
    }

    return {
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      operatingSystem: deviceInfo.operatingSystem,
      userAgent: deviceInfo.userAgent,
      deviceFingerprint: (() => {
        if (!deviceInfo.deviceFingerprint) return "";
        if (typeof deviceInfo.deviceFingerprint === "string")
          return deviceInfo.deviceFingerprint;
        if (typeof deviceInfo.deviceFingerprint === "object") {
          // For FingerprintJS result, use visitorId as primary identifier
          if (deviceInfo.deviceFingerprint.visitorId) {
            return deviceInfo.deviceFingerprint.visitorId;
          }
          // Fallback to JSON string
          try {
            return JSON.stringify(deviceInfo.deviceFingerprint);
          } catch (error) {
            return "";
          }
        }
        return "";
      })(),
      screen: screenInfo,
      timezone:
        typeof deviceInfo.timezone === "object"
          ? deviceInfo.timezone.timezone
          : deviceInfo.timezone,
      language: deviceInfo.language,
      platform: deviceInfo.platform || navigator.platform,
      plugins: Array.isArray(deviceInfo.plugins)
        ? deviceInfo.plugins.map((p) =>
            typeof p === "string" ? p : p.name || p.toString()
          )
        : [],
      canvas: deviceInfo.canvas,
      webgl: deviceInfo.webgl,
      audio: deviceInfo.audio,
      ipAddress: deviceInfo.ipAddress || "",
      location: deviceInfo.location || "",
      notes: deviceInfo.notes || "",
    };
  };

  const login = async (values) => {
    try {
      setDeviceError(null);

      // Ensure device info is available
      let currentDeviceInfo = deviceInfo;
      if (!currentDeviceInfo) {
        currentDeviceInfo = await getDeviceRegistrationInfo();
        setDeviceInfo(currentDeviceInfo);
      }

      // Note: deviceInfo not used in basic login - only for password operations

      const { data } = await loginUser({
        variables: {
          email: values.emailAddress || values.email,
          password: values.password,
        },
      });

      // Check the actual response structure from backend
      if (data?.login?.user) {
        isLoggedIn(true);

        // Set user data (the refetchQueries should handle ME query too)
        meUserData(data.login.user);
        userCacheVar(data.login.user); // Also set userCacheVar for App.js routing

        // Reconnect WebSocket with fresh authentication
        setTimeout(() => {
          reconnectWebSocket();
        }, 1000);

        navigate("/");
        return { success: true };
      }
      return { success: false, error: "No user returned" };
    } catch (err) {
      const { graphQLErrors, networkError } = err;
      let errorMsg = "Login failed";
      if (graphQLErrors) {
        graphQLErrors.forEach(({ extensions, message }) => {
          // Check for error code in extensions.code or extensions.details.extensions.code
          const errorCode =
            extensions?.details?.extensions?.code || extensions?.code;
          console.log("Login error code:", errorCode);
          if (errorCode === "AUTH_INITIAL_PASSWORD") {
            navigate("/set-initial-password", {
              state: { emailAddress: values.email },
            });
            errorMsg = message;
            return;
          } else if (errorCode === "DEVICE_NOT_AUTHORIZED") {
            isLoggedIn(false);

            const deviceData = extensions;
            setDeviceError({
              message,
              deviceId: deviceData.deviceId,
              requiresRegistration: deviceData.requiresRegistration,
              requiresApproval: deviceData.requiresApproval,
              emailAddress: values.email,
              password: values.password,
            });
            setTimeout(() => {
              navigate("/device-registration", {
                state: {
                  deviceError: {
                    message,
                    deviceId: deviceData.deviceId,
                    requiresRegistration: deviceData.requiresRegistration,
                    requiresApproval: deviceData.requiresApproval,
                  },
                  loginCredentials: {
                    emailAddress: values.email,
                    password: values.password,
                  },
                },
              });
            }, 100);
            errorMsg = message;
            return;
          }
        });
      }
      if (networkError) {
        setDeviceError(networkError.message);
        errorMsg = networkError.message;
      }
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      // Step 1: Remove push subscriptions before logout
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          if (subscription) {
            console.log('[AuthContext] Removing push subscription on logout...');
            // Call backend to remove subscription
            await client.mutate({
              mutation: REMOVE_PUSH_SUBSCRIPTION,
              variables: {
                endpoint: subscription.endpoint
              }
            });
            console.log('[AuthContext] ✓ Push subscription removed from backend');
            
            // Unsubscribe locally
            await subscription.unsubscribe();
            console.log('[AuthContext] ✓ Push subscription unsubscribed locally');
          }
        }
      } catch (subError) {
        console.error('[AuthContext] Error removing push subscription:', subError);
        // Don't block logout if subscription removal fails
      }

      // Step 2: Perform backend logout
      const { data } = await client.query({
        query: LOGOUT_QUERY,
      });
      if (data.logout) {
        // Backend logout successful
        isLoggedIn(false);
        meUserData(null);
        userCacheVar(null); // Also clear userCacheVar for App.js routing
        await client.clearStore();

        // Reconnect WebSocket to clear authentication
        reconnectWebSocket();

        navigate("/login");
      }
    } catch (err) {
      console.error("Error during logout:", err);

      // Even if backend logout fails, clean up frontend state
      // This ensures user can always logout on the frontend
      isLoggedIn(false);
      meUserData(null);
      userCacheVar(null); // Also clear userCacheVar for App.js routing
      await client.clearStore();

      // Reconnect WebSocket to clear authentication
      reconnectWebSocket();

      navigate("/login");
    }
  };

  // Method to handle authentication errors (called from error interceptor)
  const handleAuthenticationError = useCallback(async () => {
    try {
      console.log("Handling authentication error...");
      isLoggedIn(false);
      meUserData(null);
      userCacheVar(null); // Also clear userCacheVar for App.js routing
      await client.clearStore();
      navigate("/login");
    } catch (error) {
      console.error("Error during authentication error handling:", error);
      // Still try to navigate even if clearStore fails
      try {
        navigate("/login");
      } catch (navError) {
        console.error("Navigation also failed:", navError);
        // Last resort: reload to login
        window.location.hash = "#/login";
      }
    }
  }, [client, navigate]);

  // Expose handleAuthenticationError globally for error link
  useEffect(() => {
    window.handleAuthenticationError = handleAuthenticationError;
    return () => {
      delete window.handleAuthenticationError;
    };
  }, [handleAuthenticationError]);

  const setInitialPassword = async (values) => {
    try {
      const { data } = await setInitialPasswordMutation({
        variables: {
          email: values.email,
          newPassword: values.password,
        },
      });

      if (data?.setInitialPassword?.success) {
        // After setting initial password, login with the new credentials
        const loginResult = await login({
          email: values.email,
          password: values.password,
        });
        
        return loginResult;
      } else {
        throw new Error(data?.setInitialPassword?.message || "Failed to set initial password");
      }
    } catch (error) {
      console.error("Error setting initial password:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        handleAuthenticationError,
        error,
        loading,
        authError,
        authLoading,
        getMe,
        setInitialPassword,
        initialPasswordError,
        initialPasswordLoading,
        deviceError,
        deviceInfo,
        setDeviceError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
