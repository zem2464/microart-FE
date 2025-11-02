import React, { useState, useEffect } from 'react';
import { useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';
import { checkWebSocketAuth, reconnectWebSocket } from '../apolloClient';

// Test subscription for WebSocket authentication
const TEST_WEBSOCKET_CONNECTION = gql`
  subscription OnTaskStatusChanged($taskId: ID!) {
    taskStatusChanged(taskId: $taskId) {
      id
      taskCode
      status
    }
  }
`;

const WebSocketTester = () => {
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [lastMessage, setLastMessage] = useState(null);
  const [errorCount, setErrorCount] = useState(0);

  // Subscribe to task updates to test WebSocket authentication
  const { 
    data: subscriptionData, 
    loading: subscriptionLoading, 
    error: subscriptionError 
  } = useSubscription(TEST_WEBSOCKET_CONNECTION, {
    variables: { taskId: "1" }, // Test with a sample task ID
    onSubscriptionData: ({ subscriptionData }) => {
      console.log('WebSocket subscription data received:', subscriptionData);
      setLastMessage({
        timestamp: new Date().toISOString(),
        data: subscriptionData.data
      });
      setConnectionStatus('authenticated');
    },
    onSubscriptionComplete: () => {
      console.log('WebSocket subscription completed');
      setConnectionStatus('completed');
    },
    onError: (error) => {
      console.error('WebSocket subscription error:', error);
      setErrorCount(prev => prev + 1);
      setConnectionStatus('error');
    }
  });

  // Check WebSocket authentication status
  const checkAuthStatus = async () => {
    try {
      const isAuth = await checkWebSocketAuth();
      setConnectionStatus(isAuth ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('Error checking WebSocket auth:', error);
      setConnectionStatus('error');
    }
  };

  // Reconnect WebSocket
  const handleReconnect = () => {
    try {
      reconnectWebSocket();
      setConnectionStatus('connecting');
      setTimeout(() => checkAuthStatus(), 2000);
    } catch (error) {
      console.error('Error reconnecting WebSocket:', error);
      setConnectionStatus('error');
    }
  };

  useEffect(() => {
    checkAuthStatus();
    const interval = setInterval(checkAuthStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'authenticated':
      case 'connected': 
        return '#52c41a'; // success green
      case 'connecting':
      case 'unknown': 
        return '#1890ff'; // processing blue
      case 'disconnected':
      case 'error': 
        return '#ff4d4f'; // error red
      default: 
        return '#d9d9d9'; // default gray
    }
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '16px', 
      padding: '16px', 
      border: '1px solid #d9d9d9', 
      borderRadius: '8px',
      backgroundColor: '#fafafa'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '16px' 
      }}>
        <h3 style={{ margin: 0 }}>🔌 WebSocket Authentication Test</h3>
        <span style={{ 
          padding: '4px 8px', 
          borderRadius: '4px', 
          backgroundColor: getStatusColor(), 
          color: 'white', 
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {connectionStatus.toUpperCase()}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Status: </strong>
        <span style={{ color: getStatusColor() }}>
          {connectionStatus}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Subscription: </strong>
        <span style={{ 
          color: subscriptionLoading ? '#faad14' : subscriptionError ? '#ff4d4f' : '#52c41a' 
        }}>
          {subscriptionLoading ? 'Loading...' : subscriptionError ? 'Error' : 'Active'}
        </span>
      </div>

      {errorCount > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <strong>Errors: </strong>
          <span style={{ color: '#ff4d4f' }}>{errorCount}</span>
        </div>
      )}

      {lastMessage && (
        <div style={{ marginBottom: '8px' }}>
          <strong>Last Message: </strong>
          <code style={{ fontSize: '12px' }}>
            {new Date(lastMessage.timestamp).toLocaleTimeString()}
          </code>
        </div>
      )}

      {subscriptionError && (
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#fff2f0', 
          border: '1px solid #ffccc7', 
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '12px',
          color: '#a8071a'
        }}>
          <strong>Subscription Error:</strong><br />
          {subscriptionError.message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={checkAuthStatus}
          style={{ 
            padding: '4px 12px', 
            fontSize: '12px', 
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          Check Status
        </button>
        <button 
          onClick={handleReconnect}
          style={{ 
            padding: '4px 12px', 
            fontSize: '12px', 
            border: '1px solid #1890ff',
            borderRadius: '4px',
            backgroundColor: '#1890ff',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Reconnect
        </button>
      </div>

      {/* Debug Info */}
      <details style={{ marginTop: '8px' }}>
        <summary style={{ fontSize: '12px', color: '#8c8c8c', cursor: 'pointer' }}>
          Debug Info
        </summary>
        <pre style={{ 
          fontSize: '10px', 
          maxHeight: '100px', 
          overflow: 'auto',
          backgroundColor: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px',
          margin: '4px 0 0 0'
        }}>
          {JSON.stringify({
            subscriptionLoading,
            subscriptionError: subscriptionError?.message,
            lastMessage: lastMessage ? {
              timestamp: lastMessage.timestamp,
              dataKeys: lastMessage.data ? Object.keys(lastMessage.data) : []
            } : null,
            cookies: document.cookie.split(';').map(c => c.split('=')[0].trim())
          }, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default WebSocketTester;