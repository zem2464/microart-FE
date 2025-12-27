# Manual Testing Guide for WebSocket Connection Maintenance

This guide provides step-by-step instructions for manually testing the WebSocket connection maintenance feature.

## Prerequisites

1. Ensure the backend GraphQL server is running
2. Backend must support GraphQL-WS subscriptions
3. Have the frontend application running (`npm start`)
4. Log in to the application as a valid user

## Test Cases

### Test 1: Basic Connection Initialization

**Objective**: Verify WebSocket manager initializes on login

**Steps**:
1. Open the application in a browser
2. Open Browser DevTools (F12) and go to Console tab
3. Log in with valid credentials
4. Look for console messages:
   - "WebSocket Manager initialized"
   - "WebSocket connecting..."
   - "WebSocket connection opened"
   - "WebSocket connected with authentication"

**Expected Result**: All initialization messages appear in sequence

---

### Test 2: Tab Inactivity with Short Duration (<45 seconds)

**Objective**: Verify connection stays alive during short inactivity

**Steps**:
1. Log in to the application
2. Observe "Pong received" messages appearing every ~30 seconds
3. Switch to another browser tab
4. Wait 20-30 seconds
5. Return to the application tab
6. Check console for "Tab became visible - checking WebSocket connection..."
7. Verify message shows "WebSocket connection appears healthy"

**Expected Result**: 
- No reconnection triggered
- "WebSocket connection appears healthy" message appears
- No disconnection errors

---

### Test 3: Tab Inactivity with Long Duration (>45 seconds)

**Objective**: Verify automatic reconnection after prolonged inactivity

**Steps**:
1. Log in to the application
2. Switch to another browser tab or minimize browser
3. Wait 60+ seconds (ensure no pongs received during this time)
4. Return to the application tab
5. Observe console messages

**Expected Result**:
- "Tab became visible - checking WebSocket connection..."
- "Connection appears stale, initiating reconnection..."
- "Reconnecting WebSocket..."
- "WebSocket reconnected with authentication"

---

### Test 4: Network Disconnection While Tab is Active

**Objective**: Verify heartbeat monitoring detects connection loss

**Steps**:
1. Log in to the application
2. Open DevTools Network tab
3. Set Network throttling to "Offline" (or disconnect network)
4. Wait 60 seconds
5. Restore network connection (set to "Online")
6. Observe console messages

**Expected Result**:
- "No pong received in Xs - connection may be dead"
- "Tab is visible, attempting reconnection..."
- "Reconnecting WebSocket..."
- Successful reconnection after network restored

---

### Test 5: Network Disconnection While Tab is Inactive

**Objective**: Verify deferred reconnection when tab is hidden

**Steps**:
1. Log in to the application
2. Switch to another browser tab
3. Simulate network disconnection (e.g., disable WiFi)
4. Wait 60 seconds
5. Restore network connection
6. Return to application tab
7. Observe console messages

**Expected Result**:
- While hidden: "No pong received..." but no immediate reconnection
- When visible: "Tab became visible..." followed by reconnection
- Successful reconnection after visibility change

---

### Test 6: Rapid Tab Switching

**Objective**: Verify no excessive reconnection attempts

**Steps**:
1. Log in to the application
2. Rapidly switch between tabs multiple times (5-10 times in quick succession)
3. Observe console for reconnection attempts

**Expected Result**:
- At most one reconnection attempt
- Debouncing prevents multiple simultaneous reconnections
- "Reconnection already in progress, skipping..." may appear

---

### Test 7: Logout and Cleanup

**Objective**: Verify proper cleanup on logout

**Steps**:
1. Log in to the application
2. Verify WebSocket manager is initialized
3. Log out of the application
4. Check console for cleanup message

**Expected Result**:
- "[App] WebSocket Manager cleaned up" message appears
- "WebSocket Manager cleaned up" message appears
- No errors during cleanup

---

### Test 8: Subscription Data Flow

**Objective**: Verify subscriptions work correctly with maintenance features

**Steps**:
1. Log in to the application
2. Navigate to a page with active subscriptions (e.g., notifications, task updates)
3. Trigger a subscription event from another client or backend
4. Verify the subscription data is received
5. Switch tabs and wait 60 seconds
6. Return to tab (should reconnect)
7. Trigger another subscription event
8. Verify subscription data is received after reconnection

**Expected Result**:
- Subscription data received before and after reconnection
- No data loss during reconnection
- Subscriptions automatically re-establish

---

## Monitoring Tools

### Console Filters

Use these console filters to focus on specific logs:

```
WebSocket Manager      # Filter for manager-specific logs
Pong received         # Filter for heartbeat activity
Tab became visible    # Filter for visibility changes
Reconnecting          # Filter for reconnection attempts
```

### Network Tab

Monitor WebSocket connection in DevTools:

1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for connection upgrades and message frames
4. Verify ping/pong messages appear every ~30 seconds

### Performance Impact

Check CPU and memory usage:

1. Open DevTools → Performance tab
2. Record while tab is active and inactive
3. Verify no excessive CPU usage during heartbeat monitoring
4. Verify memory doesn't increase significantly over time

---

## Troubleshooting

### No "Pong received" Messages

**Possible Causes**:
- Backend not responding to pings
- WebSocket connection not established
- Backend timeout too short

**Solution**:
- Check backend GraphQL-WS configuration
- Verify `REACT_APP_GRAPHQL_WS_URL` environment variable
- Check network connectivity

### Connection Keeps Dropping

**Possible Causes**:
- Network instability
- Backend timeout too aggressive
- Browser throttling WebSocket

**Solution**:
- Check network stability
- Increase backend timeout (recommend 60+ seconds)
- Test in different browsers

### Manager Not Initializing

**Possible Causes**:
- User not logged in
- Import error in App.jsx
- JavaScript error preventing initialization

**Solution**:
- Verify user is logged in (check `user` in console)
- Check browser console for errors
- Verify all imports are correct

### High CPU Usage

**Possible Causes**:
- Heartbeat interval too frequent
- Multiple manager instances running

**Solution**:
- Verify only one manager instance (check cleanup)
- Consider increasing `checkInterval` if needed
- Check for memory leaks

---

## Success Criteria

All tests should pass with:
- ✅ No JavaScript errors in console
- ✅ WebSocket connection remains stable
- ✅ Automatic reconnection works correctly
- ✅ No excessive reconnection attempts
- ✅ Subscription data flows correctly before and after reconnection
- ✅ Proper cleanup on logout
- ✅ Minimal performance impact

---

## Reporting Issues

When reporting issues, include:

1. Browser and version
2. Console logs (full logs, not filtered)
3. Network tab screenshots showing WebSocket traffic
4. Steps to reproduce
5. Expected vs actual behavior
6. Backend configuration (if relevant)
