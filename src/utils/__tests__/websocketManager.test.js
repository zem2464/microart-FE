/**
 * Tests for WebSocket Manager
 * 
 * Validates:
 * - Document Visibility API integration
 * - Heartbeat monitoring functionality
 * - Automatic reconnection logic
 * - Pong timestamp tracking
 */

import WebSocketManager from '../websocketManager';

// Mock document.hidden and visibilitychange event
const mockVisibilityState = () => {
  let hidden = false;
  const listeners = [];

  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get() {
      return hidden;
    },
  });

  // Override addEventListener for visibilitychange
  const originalAddEventListener = document.addEventListener;
  document.addEventListener = jest.fn((event, handler) => {
    if (event === 'visibilitychange') {
      listeners.push(handler);
    } else {
      originalAddEventListener.call(document, event, handler);
    }
  });

  // Override removeEventListener
  const originalRemoveEventListener = document.removeEventListener;
  document.removeEventListener = jest.fn((event, handler) => {
    if (event === 'visibilitychange') {
      const index = listeners.indexOf(handler);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      originalRemoveEventListener.call(document, event, handler);
    }
  });

  return {
    setHidden(value) {
      hidden = value;
      listeners.forEach(listener => listener());
    },
    getListeners() {
      return listeners;
    },
  };
};

describe('WebSocketManager', () => {
  let manager;
  let mockReconnectCallback;
  let visibilityMock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockReconnectCallback = jest.fn();
    visibilityMock = mockVisibilityState();
    console.log = jest.fn(); // Mock console.log to reduce noise
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    if (manager) {
      manager.cleanup();
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('initializes with visibility listener and heartbeat monitoring', () => {
    manager = new WebSocketManager(mockReconnectCallback);

    expect(manager.isTabVisible).toBe(true); // document.hidden is false by default
    expect(manager.heartbeatInterval).not.toBeNull();
    expect(document.addEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });

  test('updates pong time when updatePongTime is called', () => {
    manager = new WebSocketManager(mockReconnectCallback);
    const initialTime = manager.lastPongTime;

    jest.advanceTimersByTime(1000);
    manager.updatePongTime();

    expect(manager.lastPongTime).toBeGreaterThan(initialTime);
  });

  test('detects tab visibility change from hidden to visible', () => {
    manager = new WebSocketManager(mockReconnectCallback);
    manager.handleTabVisible = jest.fn();

    // Simulate tab becoming hidden
    visibilityMock.setHidden(true);
    
    // Simulate tab becoming visible
    visibilityMock.setHidden(false);

    expect(manager.handleTabVisible).toHaveBeenCalled();
  });

  test('reconnects when tab becomes visible after long inactivity', () => {
    manager = new WebSocketManager(mockReconnectCallback);
    
    // Simulate old pong time (longer than heartbeat timeout)
    manager.lastPongTime = Date.now() - 50000; // 50 seconds ago

    // Simulate tab becoming hidden then visible
    visibilityMock.setHidden(true);
    visibilityMock.setHidden(false);

    expect(mockReconnectCallback).toHaveBeenCalled();
  });

  test('does not reconnect when tab becomes visible with recent pong', () => {
    manager = new WebSocketManager(mockReconnectCallback);
    
    // Update pong time to recent
    manager.updatePongTime();

    // Simulate tab becoming hidden then visible
    visibilityMock.setHidden(true);
    visibilityMock.setHidden(false);

    expect(mockReconnectCallback).not.toHaveBeenCalled();
  });

  test('heartbeat monitoring detects stale connection', () => {
    manager = new WebSocketManager(mockReconnectCallback);
    
    // Set old pong time
    manager.lastPongTime = Date.now() - 50000; // 50 seconds ago

    // Fast-forward past the check interval
    jest.advanceTimersByTime(15000); // 15 seconds

    expect(mockReconnectCallback).toHaveBeenCalled();
  });

  test('does not reconnect when heartbeat is healthy', () => {
    manager = new WebSocketManager(mockReconnectCallback);
    
    // Keep pong time recent
    manager.updatePongTime();

    // Fast-forward past the check interval
    jest.advanceTimersByTime(15000); // 15 seconds

    expect(mockReconnectCallback).not.toHaveBeenCalled();
  });

  test('prevents multiple simultaneous reconnection attempts', () => {
    manager = new WebSocketManager(mockReconnectCallback);
    
    // Trigger multiple reconnections
    manager.reconnectWebSocket();
    manager.reconnectWebSocket();
    manager.reconnectWebSocket();

    // Should only call callback once
    expect(mockReconnectCallback).toHaveBeenCalledTimes(1);
  });

  test('cleans up resources on cleanup', () => {
    manager = new WebSocketManager(mockReconnectCallback);
    const intervalBefore = manager.heartbeatInterval;

    manager.cleanup();

    expect(manager.heartbeatInterval).toBeNull();
    expect(document.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });

  test('does not reconnect when tab is hidden and connection is stale', () => {
    manager = new WebSocketManager(mockReconnectCallback);
    
    // Simulate tab being hidden
    visibilityMock.setHidden(true);
    
    // Set old pong time
    manager.lastPongTime = Date.now() - 50000; // 50 seconds ago

    // Fast-forward past the check interval
    jest.advanceTimersByTime(15000); // 15 seconds

    // Should not reconnect while tab is hidden
    expect(mockReconnectCallback).not.toHaveBeenCalled();
  });

  test('reconnects only when tab is visible and connection is stale', () => {
    manager = new WebSocketManager(mockReconnectCallback);
    
    // Tab is visible by default
    expect(manager.isTabVisible).toBe(true);
    
    // Set old pong time
    manager.lastPongTime = Date.now() - 50000; // 50 seconds ago

    // Fast-forward past the check interval
    jest.advanceTimersByTime(15000); // 15 seconds

    // Should reconnect since tab is visible
    expect(mockReconnectCallback).toHaveBeenCalled();
  });
});

console.log('✅ WebSocket Manager test file created successfully');
console.log('✅ Test coverage includes:');
console.log('   - Document Visibility API integration');
console.log('   - Heartbeat monitoring (15s checks, 45s timeout)');
console.log('   - Automatic reconnection on visibility changes');
console.log('   - Pong timestamp tracking');
console.log('   - Multiple reconnection prevention');
console.log('   - Resource cleanup');
