# WebSocket Connection Maintenance

## Overview

This document describes the WebSocket connection maintenance implementation that keeps connections alive even when browser tabs are inactive.

## Features

### 1. Document Visibility API Integration
- Detects when the browser tab becomes active or inactive
- Monitors tab visibility state changes using `document.hidden` and `visibilitychange` events
- Automatically checks connection health when tab becomes visible after being inactive

### 2. Heartbeat Monitoring
- Periodic checks every 15 seconds to monitor connection health
- Timeout threshold of 45 seconds (slightly longer than the GraphQL-WS `keepAlive` interval of 30s)
- Tracks the last received "pong" timestamp to determine connection liveness

### 3. Automatic Reconnection
- Reconnects WebSocket when tab becomes visible after prolonged inactivity
- Prevents reconnection attempts when tab is hidden to conserve resources
- Includes debouncing to prevent multiple simultaneous reconnection attempts

### 4. Ping/Pong Mechanism
- Leverages GraphQL-WS library's built-in `keepAlive` (30 seconds)
- Enhanced pong handler updates the manager's timestamp
- Server sends "pong" responses to client "ping" messages

## Implementation Details

### Components

#### 1. `websocketManager.js`
Located at: `src/utils/websocketManager.js`

**Purpose**: Core manager class that handles visibility tracking and heartbeat monitoring.

**Key Methods**:
- `setupVisibilityListener()`: Registers Document Visibility API listener
- `handleTabVisible()`: Checks connection health when tab becomes visible
- `startHeartbeatMonitoring()`: Initiates periodic connection health checks
- `updatePongTime()`: Updates last pong timestamp (called when pong is received)
- `reconnectWebSocket()`: Triggers WebSocket reconnection with debouncing
- `cleanup()`: Removes listeners and clears intervals

**Configuration**:
```javascript
{
  heartbeatTimeout: 45000,  // 45 seconds - max time without pong
  checkInterval: 15000,     // 15 seconds - how often to check
}
```

#### 2. `apolloClient.js` Enhancements
Located at: `src/apolloClient.js`

**Changes**:
- Enhanced pong handler to call `wsManager.updatePongTime()`
- Added `initWebSocketManager()` function to initialize the manager
- Added `cleanupWebSocketManager()` function to cleanup resources
- Integrated manager with existing GraphQL-WS configuration

**GraphQL-WS Configuration**:
```javascript
{
  keepAlive: 30000,           // Send ping every 30 seconds
  retryAttempts: 5,           // Retry connection 5 times on failure
  connectionAckWaitTimeout: 10000,  // Wait up to 10s for ack
}
```

#### 3. `App.jsx` Integration
Located at: `src/App.jsx`

**Changes**:
- Initialize WebSocket manager when user logs in
- Cleanup manager when user logs out or component unmounts
- Manager lifecycle tied to user authentication state

## Usage

### Initialization
The WebSocket manager is automatically initialized when a user logs in:

```javascript
useEffect(() => {
  if (user) {
    const manager = initWebSocketManager();
    console.log('[App] WebSocket Manager initialized');
    
    return () => {
      cleanupWebSocketManager();
      console.log('[App] WebSocket Manager cleaned up');
    };
  }
}, [user]);
```

### Manual Reconnection
You can manually trigger reconnection using the existing `reconnectWebSocket()` function:

```javascript
import { reconnectWebSocket } from './apolloClient';

// Trigger reconnection
reconnectWebSocket();
```

## Behavior

### Scenario 1: Tab Goes Inactive
1. User switches to another tab or minimizes browser
2. Document Visibility API detects hidden state
3. WebSocket maintains connection via GraphQL-WS `keepAlive` (ping every 30s)
4. Heartbeat monitoring continues but doesn't trigger reconnection while hidden

### Scenario 2: Tab Becomes Active After Short Inactivity (<45s)
1. User returns to tab
2. Document Visibility API detects visible state
3. Manager checks time since last pong
4. Connection is still healthy (< 45s), no reconnection needed

### Scenario 3: Tab Becomes Active After Long Inactivity (>45s)
1. User returns to tab after extended period
2. Document Visibility API detects visible state
3. Manager checks time since last pong
4. Connection is stale (> 45s), automatic reconnection triggered
5. New WebSocket connection established with fresh authentication

### Scenario 4: Connection Drops While Tab is Active
1. Network issue causes connection to drop
2. Heartbeat monitoring detects no pong received
3. After 45 seconds without pong, automatic reconnection triggered
4. Multiple simultaneous reconnection attempts are prevented

### Scenario 5: Connection Drops While Tab is Inactive
1. Network issue causes connection to drop while tab is hidden
2. Heartbeat monitoring detects no pong received
3. Reconnection is deferred until tab becomes visible
4. When user returns to tab, reconnection is triggered

## Testing

### Automated Tests
Located at: `src/utils/__tests__/websocketManager.test.js`

Run tests:
```bash
npm test websocketManager.test.js
```

**Test Coverage**:
- Document Visibility API integration
- Heartbeat monitoring (15s checks, 45s timeout)
- Automatic reconnection on visibility changes
- Pong timestamp tracking
- Multiple reconnection prevention
- Resource cleanup

### Manual Testing

#### Test 1: Tab Inactivity
1. Log in to the application
2. Open browser DevTools and check console for "WebSocket Manager initialized"
3. Switch to another tab for 60+ seconds
4. Return to the application tab
5. Verify console shows "Tab became visible - checking WebSocket connection..."
6. Verify "Connection appears stale, initiating reconnection..." if connection timed out

#### Test 2: Network Disconnect
1. Log in to the application
2. Open browser DevTools Network tab
3. Set network throttling to "Offline"
4. Wait 60 seconds
5. Set network back to "Online"
6. Verify WebSocket reconnection in console

#### Test 3: Heartbeat Monitoring
1. Log in to the application
2. Open browser console
3. Look for periodic "Pong received" messages every ~30 seconds
4. Verify heartbeat monitoring is working

## Environment Variables

Required environment variable in `.env`:

```bash
REACT_APP_GRAPHQL_WS_URL=ws://localhost:4000/graphql
# or for production:
REACT_APP_GRAPHQL_WS_URL=wss://your-domain.com/graphql
```

## Backend Compatibility

The implementation is compatible with GraphQL-WS protocol. Ensure your backend:

1. Supports GraphQL-WS subscriptions
2. Responds to ping messages with pong
3. Has appropriate timeout configuration (recommended: 60+ seconds)
4. Handles authentication in connection params

**Backend Configuration Recommendation**:
```javascript
// Example backend config (adjust to your setup)
{
  keepAlive: 30000,  // Align with frontend keepAlive
  connectionInitWaitTimeout: 10000,
}
```

## Troubleshooting

### Connection Keeps Dropping
- Check backend WebSocket timeout settings
- Verify network stability
- Check browser console for error messages
- Ensure `REACT_APP_GRAPHQL_WS_URL` is correctly configured

### Reconnection Not Working
- Verify WebSocket manager is initialized (check console logs)
- Check that user is logged in (manager only works when authenticated)
- Verify Document Visibility API is supported in browser

### High CPU Usage
- Verify heartbeat check interval is not too frequent (default: 15s)
- Check that cleanup is called when user logs out

## Browser Support

The implementation uses:
- **Document Visibility API**: Supported in all modern browsers (IE 10+)
- **WebSocket**: Supported in all modern browsers (IE 10+)
- **graphql-ws**: Requires modern JavaScript (ES6+)

## Future Enhancements

Potential improvements:
1. Configurable heartbeat intervals via environment variables
2. Exponential backoff for reconnection attempts
3. Connection quality metrics and monitoring
4. User-visible connection status indicator
5. Offline queue for subscription messages

## References

- [Document Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [graphql-ws Library](https://github.com/enisdenjo/graphql-ws)
- [Apollo Client WebSocket Link](https://www.apollographql.com/docs/react/data/subscriptions/)
- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
