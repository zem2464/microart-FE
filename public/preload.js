// Guard requires so this file can be safely copied into web builds
let contextBridge;
let ipcRenderer;
let NotificationApi;
let nativeImage;
let nodePath;
let fsApi;

try {
  const electron = require('electron');
  console.log('[Preload] electron module loaded:', !!electron);
  console.log('[Preload] electron keys:', electron ? Object.keys(electron).join(', ') : 'none');
  contextBridge = electron.contextBridge;
  ipcRenderer = electron.ipcRenderer;
  NotificationApi = electron.Notification;
  nativeImage = electron.nativeImage;
  console.log('[Preload] contextBridge extracted:', !!contextBridge);
  console.log('[Preload] ipcRenderer extracted:', !!ipcRenderer);
} catch (e) {
  // Not running in Electron preload environment (or Node builtin not available)
  // Keep values undefined — we'll fallback to no-op behavior below.
  // This prevents bundlers or browsers from failing when copying this file.
  console.error('[Preload] Failed to require electron:', e);
}

try {
  nodePath = require('path');
} catch (e) {
  nodePath = null;
}

try {
  fsApi = require('fs');
} catch (e) {
  fsApi = null;
}

console.log('[Preload] Script loading...');
console.log('[Preload] __dirname:', typeof __dirname !== 'undefined' ? __dirname : '(browser)');
console.log('[Preload] contextBridge available:', !!contextBridge);

const expose = (name, value) => {
  if (contextBridge && contextBridge.exposeInMainWorld) {
    try {
      contextBridge.exposeInMainWorld(name, value);
      return;
    } catch (e) {
      console.warn('[Preload] contextBridge.exposeInMainWorld failed:', e);
    }
  }

  // Fallback for environments where contextBridge isn't present (shouldn't happen in real Electron preload)
  try {
    window[name] = value;
  } catch (e) {
    // ignore
  }
};

expose('electron', {
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

  // Cookie management APIs for Electron
  getCookies: (url) => ipcRenderer.invoke('get-cookies', url),
  setCookie: (details) => ipcRenderer.invoke('set-cookie', details),
  removeCookie: (url, name) => ipcRenderer.invoke('remove-cookie', url, name),

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
    if (ipcRenderer?.on) ipcRenderer.on('navigate-to', (event, url) => callback(url));
  },
});

// Simple global flag for detection in renderer
expose('isElectron', !!ipcRenderer);

// Also expose a top-level helper for convenience: window.testElectronNotification()
expose('testElectronNotification', () => {
  console.log('[Preload] global testElectronNotification invoked');
  if (ipcRenderer?.send) {
    ipcRenderer.send('show-notification', {
      title: 'Test Notification from Preload (global)',
      body: 'If you see this, Electron native notifications are working globally! \u2713',
      icon: '/images/logo192.png',
      silent: false,
      data: { test: true, scope: 'global' },
    });
  }
});

console.log('[Preload] window.electron exposed successfully');
console.log('[Preload] ipcRenderer was available:', !!ipcRenderer, '(this is what window.electron.isElectron should be in renderer)');
