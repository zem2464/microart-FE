const { contextBridge, ipcRenderer, Notification, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('[Preload] Script loading...');
console.log('[Preload] __dirname:', __dirname);
console.log('[Preload] contextBridge available:', !!contextBridge);

contextBridge.exposeInMainWorld('electron', {
  // App control
  minimize: () => ipcRenderer.send('app-minimize'),
  maximize: () => ipcRenderer.send('app-maximize'),
  close: () => ipcRenderer.send('app-close'),
  refresh: () => ipcRenderer.send('app-refresh'),

  // App info
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),

  // Auto-launch settings
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),

  // Updates
  onUpdateAvailable: (callback) =>
    ipcRenderer.on('update-available', () => callback()),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on('update-downloaded', () => callback()),
  restartApp: () => ipcRenderer.send('restart-app'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),

  // Settings
  onOpenSettings: (callback) =>
    ipcRenderer.on('open-settings', () => callback()),

  // Platform info
  getPlatform: () => process.platform,
  isElectron: true,

  // Request notification permission (for macOS)
  requestNotificationPermission: () => {
    return ipcRenderer.invoke('request-notification-permission');
  },

  // Native notifications - send to main process
  showNotification: (title, options) => {
    console.log('[Preload] Sending notification to main process:', { title, body: options.body });
    // Send notification data to main process
    ipcRenderer.send('show-notification', {
      title,
      body: options.body,
      icon: options.icon,
      silent: options.silent || false,
      data: options.data || {}
    });
  },

  // Quick test helper exposed under window.electron
  testElectronNotification: () => {
    console.log('[Preload] testElectronNotification invoked');
    ipcRenderer.send('show-notification', {
      title: 'Test Notification from Preload',
      body: 'If you see this, Electron native notifications are working! \u2713',
      icon: '/images/logo192.png',
      silent: false,
      data: { test: true }
    });
  },

  // Navigation from main process
  onNavigateTo: (callback) => {
    ipcRenderer.on('navigate-to', (event, url) => callback(url));
  },
});

// Simple global flag for detection in renderer
contextBridge.exposeInMainWorld('isElectron', true);

// Also expose a top-level helper for convenience: window.testElectronNotification()
contextBridge.exposeInMainWorld('testElectronNotification', () => {
  console.log('[Preload] global testElectronNotification invoked');
  ipcRenderer.send('show-notification', {
    title: 'Test Notification from Preload (global)',
    body: 'If you see this, Electron native notifications are working globally! \u2713',
    icon: '/images/logo192.png',
    silent: false,
    data: { test: true, scope: 'global' }
  });
});

console.log('[Preload] window.electron exposed successfully');
console.log('[Preload] window.electron.isElectron:', window.electron?.isElectron);
