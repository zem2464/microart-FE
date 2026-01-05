import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  split,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { setContext } from "@apollo/client/link/context";
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import {
  isLoggedIn,
  meUserData,
  isApplicationLoading,
} from "./cache/userCacheVar";
import { getAuthToken } from "./utils/cookieUtils";
import { createElectronFetch } from "./utils/electronCookieSync";
import WebSocketManager from "./utils/websocketManager";

const createErrorLink = (client) =>
  onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      const errorAuth = graphQLErrors.some(
        (error) =>
          error.message.includes("Unauthorized") ||
          error.message.includes("Not authenticated") ||
          error.extensions?.code === "UNAUTHENTICATED" ||
          error.extensions?.code === "NOT_AUTHENTICATED"
      );

      if (
        errorAuth &&
        ![
          "/login",
          "/login/",
          "/device-registration",
          "/set-initial-password",
          "/change-expire-password",
        ].includes(window.location.pathname)
      ) {
        // Unauthorized access detected - logging out
        console.log("Authentication error detected, logging out user...");
        isLoggedIn(false);
        meUserData(null);
        isApplicationLoading(false);

        client
          .clearStore()
          .catch((e) => console.error("Error clearing store:", e));

        localStorage.removeItem("apollo-cache-persist");
        console.warn("Your session has expired. Please login again.");
        
        // Use global handleAuthenticationError if available (works with HashRouter in Electron)
        if (typeof window.handleAuthenticationError === 'function') {
          window.handleAuthenticationError();
        } else {
          window.location.href = "/login";
        }
      }
    }

    if (networkError) {
      console.error(`Network error: ${networkError}`);

      // Handle network errors that might indicate authentication issues
      if (networkError.statusCode === 401 || networkError.statusCode === 403) {
        console.log('Network authentication error detected, logging out user...');

        if (![
          "/login",
          "/login/",
          "/device-registration",
          "/set-initial-password",
          "/change-expire-password",
        ].includes(window.location.pathname)) {
          isLoggedIn(false);
          meUserData(null);
          isApplicationLoading(false);

          client
            .clearStore()
            .catch((e) => console.error("Error clearing store:", e));

          localStorage.removeItem("apollo-cache-persist");
          
          // Use global handleAuthenticationError if available (works with HashRouter in Electron)
          if (typeof window.handleAuthenticationError === 'function') {
            window.handleAuthenticationError();
          } else {
            window.location.href = "/login";
          }
        }
      }
    }
  });

const operationNameHeaderLink = setContext((operation, prevContext) => ({
  headers: {
    ...prevContext.headers,
    "x-apollo-operation-name": operation.operationName || "Operation",
    "apollo-require-preflight": "true", // Add this header for Apollo Server 4 CSRF protection
  },
}));

const GRAPHQL_HTTP_URL = process.env.REACT_APP_GRAPHQL_URL || "http://localhost:4000/graphql";

// Build a sensible WebSocket URL even if REACT_APP_GRAPHQL_WS_URL is missing (e.g., desktop builds)
const buildWebSocketUrl = (httpUrl) => {
  try {
    const parsed = new URL(httpUrl);
    parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    return parsed.toString();
  } catch (err) {
    console.warn("[Apollo] Unable to derive WebSocket URL from HTTP URL", err);
    return null;
  }
};

const GRAPHQL_WS_URL = process.env.REACT_APP_GRAPHQL_WS_URL || buildWebSocketUrl(GRAPHQL_HTTP_URL);

const httpLink = createHttpLink({
  uri: GRAPHQL_HTTP_URL,
  credentials: "include",
  fetch: window.electron?.isElectron ? createElectronFetch() : undefined, // Use custom fetch for Electron
});

console.log('[Apollo] HTTP Link configured with', window.electron?.isElectron ? 'Electron cookie sync' : 'standard credentials');
console.log('[Apollo] WebSocket URL', GRAPHQL_WS_URL || 'not configured');

// WebSocket link - works in both development and production with SSL
// Global WebSocket manager instance
let wsManager = null;

export const wsLink = GRAPHQL_WS_URL ? new GraphQLWsLink(createClient({
  url: GRAPHQL_WS_URL,
  connectionParams: () => {
    const token = getAuthToken();
    return {
      authToken: token ? `Bearer ${token}` : "",
    };
  },
  // Cookies will also be sent automatically with credentials: include
  retryAttempts: 5,
  shouldRetry: (errOrCloseEvent) => {
    // Don't retry on authentication errors
    return true;
  },
  keepAlive: 30000, // Send ping every 30 seconds
  lazy: false, // Connect immediately when the client is created
  webSocketImpl: typeof window !== 'undefined' ? window.WebSocket : null,
  connectionAckWaitTimeout: 10000, // Wait up to 10s for connection acknowledgment
  on: {
    connecting: () => {
      console.log('WebSocket connecting...');
    },
    opened: (socket) => {
      console.log('WebSocket connection opened', socket);
    },
    connected: (socket, payload) => {
      console.log('WebSocket connected with authentication', payload);
      // Update pong time on successful connection
      if (wsManager) {
        wsManager.updatePongTime();
      }
    },
    ping: (received) => {
      if (!received) console.log('Ping sent');
    },
    pong: (received) => {
      if (received) {
        console.log('Pong received');
        // Update the WebSocket manager's last pong time
        if (wsManager) {
          wsManager.updatePongTime();
        }
      }
    },
    closed: (event) => {
      console.log('WebSocket closed:', event?.code, event?.reason);
      if (event?.code === 1006) {
        console.error('WebSocket closed abnormally - possible network issue or server unavailable');
      }
    },
    error: (error) => {
      console.error("WebSocket error:", error);
    },
  },
})) : null;

const cache = new InMemoryCache({
  typePolicies: {
    User: {
      keyFields: ["id"],
      fields: {
        role: {
          merge(existing, incoming) {
            if (
              incoming &&
              typeof incoming === "object" &&
              Object.keys(incoming).length > 0
            ) {
              return { ...existing, ...incoming };
            }
            return existing;
          },
        },
      },
    },
    Grading: {
      keyFields: ["id"],
      fields: {
        taskTypes: {
          // Don't normalize - keep as a plain array to preserve gradingTask data
          merge(existing, incoming) {
            return incoming;
          },
          // Read function to ensure we always get the raw data
          read(existing) {
            return existing;
          },
        },
      },
    },
    TaskType: {
      keyFields: false, // Disable normalization for TaskType to preserve gradingTask context
    },
    WorkType: {
      keyFields: false, // Disable normalization for WorkType to prevent reference issues
    },
    Project: {
      keyFields: ["id"],
    },
    Task: {
      keyFields: ["id"],
      fields: {
        // Ensure task updates merge properly
        comments: {
          merge(existing = [], incoming = []) {
            return incoming;
          },
        },
      },
    },
    TaskComment: {
      keyFields: ["id"],
      fields: {
        replies: {
          merge(existing = [], incoming = []) {
            return incoming;
          },
        },
      },
    },
    TaskCommentConnection: {
      keyFields: false,
      fields: {
        nodes: {
          merge(existing = [], incoming = []) {
            return incoming;
          },
        },
      },
    },
    Notification: {
      keyFields: ["id"],
      fields: {
        // Ensure notification fields update properly
        isRead: {
          merge(existing, incoming) {
            return incoming;
          },
        },
        readAt: {
          merge(existing, incoming) {
            return incoming;
          },
        },
      },
    },
    Role: {
      keyFields: ["id"],
    },
    AuditLog: {
      keyFields: ["id"],
    },
  },
});

// Split link to route subscriptions to WebSocket (if available) or HTTP
const splitLink = wsLink ? split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([operationNameHeaderLink, httpLink])
) : from([operationNameHeaderLink, httpLink]);

// Create Apollo Client
const client = new ApolloClient({
  link: from([splitLink]),
  cache,
  credentials: "include",
});

// Create the error link with the client instance
const errorLink = createErrorLink(client);

// Update client with the complete link chain including error handling
client.setLink(from([errorLink, splitLink]));

// Store client reference globally for error handling
window.apolloClient = client;

// Export a function to reconnect WebSocket with new auth (HMS approach)
export const reconnectWebSocket = () => {
  console.log("Reconnecting WebSocket with fresh authentication...");

  // Get the current client
  const currentLink = client.link;
  if (currentLink && currentLink.left && currentLink.left.client) {
    try {
      // Close existing WebSocket connection
      currentLink.left.client.terminate();
    } catch (error) {
      console.warn("Error closing existing WebSocket:", error);
    }
  }

  // Create new WebSocket link with fresh auth - no connectionParams needed
  const newWsLink = new GraphQLWsLink(
    createClient({
      url: GRAPHQL_WS_URL || "ws://localhost:4000/graphql",
      connectionParams: () => {
        const token = getAuthToken();
        return {
          authToken: token ? `Bearer ${token}` : "",
        };
      },
      // Cookies will also be sent automatically with credentials: include
      retryAttempts: 5,
      shouldRetry: () => true,
      keepAlive: 30000,
      on: {
        connecting: () => {
          // WebSocket reconnecting
        },
        opened: () => {
          // WebSocket reconnection opened
        },
        connected: () => {
          // WebSocket reconnection established
          console.log('WebSocket reconnected with authentication');
        },
        closed: (event) => {
          // WebSocket reconnection closed
        },
        error: (error) => {
          console.error("WebSocket reconnection error:", error);
        },
      },
    })
  );

  // Create new split link
  const newSplitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      );
    },
    newWsLink,
    from([operationNameHeaderLink, httpLink])
  );

  // Update client with new link
  client.setLink(from([errorLink, newSplitLink]));
};

// Function to check WebSocket authentication status
export const checkWebSocketAuth = () => {
  return new Promise((resolve) => {
    if (wsLink && wsLink.client) {
      // Check if WebSocket is connected and authenticated
      const connectionState = wsLink.client.status;
      resolve(connectionState === 'connected');
    } else {
      resolve(false);
    }
  });
};

// Initialize WebSocket Manager for visibility and heartbeat monitoring
export const initWebSocketManager = () => {
  if (!wsManager && typeof window !== 'undefined') {
    wsManager = new WebSocketManager(reconnectWebSocket);
    console.log('WebSocket Manager initialized');
  }
  return wsManager;
};

// Clean up WebSocket Manager
export const cleanupWebSocketManager = () => {
  if (wsManager) {
    wsManager.cleanup();
    wsManager = null;
    console.log('WebSocket Manager cleaned up');
  }
};

// Export the manager instance getter
export const getWebSocketManager = () => wsManager;

export default client;