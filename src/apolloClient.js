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

// WebSocket link for subscriptions
export const wsLink = new GraphQLWsLink(createClient({
  url: process.env.REACT_APP_GRAPHQL_WS_URL || "ws://localhost:4000/graphql",
  connectionParams: () => ({
    // Add authentication headers if needed
    credentials: "include",
  }),
  on: {
    connected: () => console.log('WebSocket connected'),
    closed: () => console.log('WebSocket closed'),
    error: (err) => console.error('WebSocket error:', err),
  },
}));

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
    Role: {
      keyFields: ["id"],
    },
    AuditLog: {
      keyFields: ["id"],
    },
  },
});

// Split link to route subscriptions to WebSocket and queries/mutations to HTTP
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([operationNameHeaderLink, httpLink])
);

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

// WebSocket reconnection function
export const reconnectWebSocket = () => {
  console.log("Attempting to reconnect WebSocket...");
  try {
    // The GraphQLWsLink will automatically handle reconnection
    // We can trigger a manual reconnection if needed
    if (wsLink && wsLink.client) {
      wsLink.client.dispose();
      // The link will automatically reconnect on next subscription
    }
  } catch (error) {
    console.error("Error during WebSocket reconnection:", error);
  }
};

export default client;