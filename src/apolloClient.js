import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { setContext } from "@apollo/client/link/context";
import {
  isLoggedIn,
  meUserData,
  isApplicationLoading,
} from "./cache/userCacheVar";

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
        window.location.href = "/login";
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
          window.location.href = "/login";
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

const httpLink = createHttpLink({
  uri: process.env.REACT_APP_GRAPHQL_URL || "http://localhost:4000/graphql",
  credentials: "include",
});

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
    Project: {
      keyFields: ["id"],
    },
    Task: {
      keyFields: ["id"],
    },
    Role: {
      keyFields: ["id"],
    },
    AuditLog: {
      keyFields: ["id"],
    },
  },
});

// Create Apollo Client
const client = new ApolloClient({
  link: from([operationNameHeaderLink, httpLink]),
  cache,
  credentials: "include",
});

// Create the error link with the client instance
const errorLink = createErrorLink(client);

// Update client with the complete link chain
client.setLink(from([errorLink, operationNameHeaderLink, httpLink]));

// Store client reference globally for error handling
window.apolloClient = client;

// Simple reconnect function (placeholder for future WebSocket implementation)
export const reconnectWebSocket = () => {
  console.log("WebSocket reconnection placeholder - WebSockets not configured yet");
  // Future WebSocket reconnection logic will go here
};

export default client;