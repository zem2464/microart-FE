/**
 * WebSocket Connection Manager
 * 
 * Manages WebSocket connections with:
 * - Document Visibility API integration for tab inactivity detection
 * - Heartbeat monitoring to detect connection health
 * - Automatic reconnection on tab visibility changes
 * - Ping/Pong mechanism for keeping connections alive
 */

class WebSocketManager {
  constructor(reconnectCallback) {
    this.reconnectCallback = reconnectCallback;
    this.isTabVisible = !document.hidden;
    this.lastPongTime = Date.now();
    this.heartbeatInterval = null;
    this.heartbeatTimeout = 45000; // 45 seconds - slightly longer than keepAlive (30s)
    this.checkInterval = 15000; // Check every 15 seconds
    this.isReconnecting = false;
    
    this.init();
  }

  init() {
    // Set up Document Visibility API listener
    this.setupVisibilityListener();
    
    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
    
    console.log('WebSocket Manager initialized with visibility tracking and heartbeat monitoring');
  }

  /**
   * Set up Document Visibility API to detect tab state changes
   */
  setupVisibilityListener() {
    const handleVisibilityChange = () => {
      const wasVisible = this.isTabVisible;
      this.isTabVisible = !document.hidden;

      if (this.isTabVisible && !wasVisible) {
        // Tab became visible after being hidden
        console.log('Tab became visible - checking WebSocket connection...');
        this.handleTabVisible();
      } else if (!this.isTabVisible && wasVisible) {
        // Tab became hidden
        console.log('Tab became hidden - WebSocket will maintain connection via keepAlive');
      }
    };

    // Add event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Store the handler for cleanup
    this.visibilityHandler = handleVisibilityChange;
    
    console.log('Document Visibility API listener registered');
  }

  /**
   * Handle tab becoming visible
   * Check connection health and reconnect if needed
   */
  handleTabVisible() {
    const timeSinceLastPong = Date.now() - this.lastPongTime;
    
    console.log(`Time since last pong: ${Math.round(timeSinceLastPong / 1000)}s`);
    
    // If we haven't received a pong in longer than the heartbeat timeout,
    // the connection might be stale - reconnect
    if (timeSinceLastPong > this.heartbeatTimeout) {
      console.log('Connection appears stale, initiating reconnection...');
      this.reconnectWebSocket();
    } else {
      console.log('WebSocket connection appears healthy');
    }
  }

  /**
   * Start heartbeat monitoring to detect connection health
   */
  startHeartbeatMonitoring() {
    // Clear any existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastPong = Date.now() - this.lastPongTime;
      
      // If we haven't received a pong in longer than the timeout, connection is dead
      if (timeSinceLastPong > this.heartbeatTimeout) {
        console.warn(`No pong received in ${Math.round(timeSinceLastPong / 1000)}s - connection may be dead`);
        
        // Only attempt reconnection if tab is visible
        if (this.isTabVisible) {
          console.log('Tab is visible, attempting reconnection...');
          this.reconnectWebSocket();
        } else {
          console.log('Tab is hidden, will reconnect when tab becomes visible');
        }
      }
    }, this.checkInterval);

    console.log(`Heartbeat monitoring started (check every ${this.checkInterval / 1000}s, timeout after ${this.heartbeatTimeout / 1000}s)`);
  }

  /**
   * Update last pong time (called when pong is received)
   */
  updatePongTime() {
    this.lastPongTime = Date.now();
  }

  /**
   * Reconnect the WebSocket connection
   */
  reconnectWebSocket() {
    // Prevent multiple simultaneous reconnection attempts
    if (this.isReconnecting) {
      console.log('Reconnection already in progress, skipping...');
      return;
    }

    this.isReconnecting = true;
    
    try {
      console.log('Reconnecting WebSocket...');
      
      // Call the reconnection callback
      if (this.reconnectCallback) {
        this.reconnectCallback();
      }
      
      // Reset pong time to current time to avoid immediate timeout
      this.lastPongTime = Date.now();
      
      // Reset reconnecting flag after a delay
      setTimeout(() => {
        this.isReconnecting = false;
      }, 5000);
    } catch (error) {
      console.error('Error during WebSocket reconnection:', error);
      this.isReconnecting = false;
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Remove visibility listener
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    console.log('WebSocket Manager cleaned up');
  }
}

export default WebSocketManager;
