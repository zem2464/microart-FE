import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import App from './App';
import './index.css';
import client from './apolloClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import './services/NotificationService';

// Check if running in Electron
console.log('[index.js] Checking Electron environment...');
console.log('[index.js] window.electron:', window.electron);
console.log('[index.js] window.electron.isElectron:', window.electron?.isElectron);

// Fallback: ensure Electron test helper exists even if side-effect registration is skipped
if (!window.testElectronNotification) {
  window.testElectronNotification = () => {
    console.log('[index.js] Fallback testElectronNotification invoked');
    const isElectron = !!window.electron?.isElectron;
    console.log('[index.js] isElectron:', isElectron);
    console.log('[index.js] electron.showNotification exists:', !!window.electron?.showNotification);

    if (!isElectron) {
      console.error('[index.js] ✗ Not running in Electron environment');
      return;
    }
    if (!window.electron?.showNotification) {
      console.error('[index.js] ✗ showNotification API missing on window.electron');
      return;
    }

    try {
      window.electron.showNotification('Test Notification from Console', {
        body: 'If you see this, Electron native notifications are working! ✓',
        icon: '/images/logo192.png',
        silent: false,
        data: { test: true }
      });
      console.log('[index.js] ✓ Notification sent (fallback helper)');
    } catch (err) {
      console.error('[index.js] ✗ Failed to send notification (fallback helper):', err);
    }
  };
}

// Configure dayjs globally with IST timezone for the entire application
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Kolkata');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);