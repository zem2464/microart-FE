const { app, BrowserWindow, Menu, ipcMain, Tray, dialog, nativeImage, systemPreferences, Notification } = require('electron');
const isDev = require('electron-is-dev');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

const store = new Store();
let mainWindow;
let tray;
let isQuitting = false;
let splashWindow;
let updateStatus = {
  updateAvailable: false,
  updateDownloaded: false,
  lastError: null,
  downloadProgress: 0,
  isChecking: false,
};

// Configure auto-updater logging
Object.assign(console, log.functions);
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Configure auto-updater for S3
if (!isDev) {
  autoUpdater.setFeedURL({
    provider: 's3',
    bucket: 'microart-desktop-releases',
    region: 'us-east-1',
    path: '/',
  });
  log.info('Auto-updater configured for S3');
  log.info('Current app version:', app.getVersion());
}

// Auto-updater will automatically compare versions
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Handle Squirrel events on Windows
if (process.platform === 'win32' && require('electron-squirrel-startup')) {
  app.quit();
}

/**
 * Remove macOS Gatekeeper quarantine attributes from the app bundle
 * This fixes code signature validation errors after updates
 * @returns {Promise<void>}
 */
async function removeQuarantineAttributes() {
  if (process.platform !== 'darwin') {
    log.info('[Quarantine] Not macOS, skipping quarantine attribute removal');
    return;
  }

  const appPath = app.getAppPath();
  const appBundlePath = path.resolve(appPath, '..', '..');
  
  log.info('[Quarantine] Attempting to remove quarantine attributes from:', appBundlePath);
  
  try {
    // Try to remove quarantine attributes using xattr command
    const { stdout, stderr } = await execFilePromise('xattr', ['-dr', 'com.apple.quarantine', appBundlePath]);
    
    if (stderr) {
      log.warn('[Quarantine] xattr stderr:', stderr);
    }
    
    log.info('[Quarantine] Successfully removed quarantine attributes from app bundle');
    return true;
  } catch (error) {
    // It's okay if xattr fails - the app might not have quarantine attributes
    // This is common for freshly built apps
    if (error.code === 'ENOENT') {
      log.warn('[Quarantine] xattr command not found - this is normal on older macOS versions');
    } else if (error.message?.includes('No such file or directory')) {
      log.info('[Quarantine] Quarantine attributes not found or already removed');
    } else {
      log.warn('[Quarantine] Failed to remove quarantine attributes:', error.message);
    }
    return false;
  }
}

function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'images', 'logo192.png'),
  });

  const splashUrl = isDev
    ? 'http://localhost:3000?splash=true'
    : `file://${path.join(__dirname, '../build/index.html')}?splash=true`;

  splashWindow.loadURL(splashUrl);
}

function createWindow() {
  // Configure session to handle cookies properly
  const { session } = require('electron');
  const sess = session.defaultSession;
  const PROD_FRONTEND_ORIGIN = 'https://main.d3ir4tjbgw6dmp.amplifyapp.com';
  const PROD_GRAPHQL_URL = 'https://api.imagecare.in/graphql';
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.REACT_APP_APP_ORIGIN || (isDev ? 'http://localhost:3000' : PROD_FRONTEND_ORIGIN);
  const BACKEND_URL = process.env.REACT_APP_GRAPHQL_URL || (isDev ? 'http://localhost:4000/graphql' : PROD_GRAPHQL_URL);
  
  // Enable persistent cookie storage
  sess.setUserAgent(sess.getUserAgent() + ' Electron');
  
  // Configure cookies to accept from backend
  sess.cookies.on('changed', (event, cookie, cause, removed) => {
    console.log('[Electron] Cookie changed:', { 
      name: cookie.name, 
      domain: cookie.domain,
      path: cookie.path,
      value: cookie.value ? '***' : undefined,
      cause, 
      removed 
    });
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: isDev
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false, // Disable sandbox to allow preload script to use Node.js modules
      partition: 'persist:main', // Use persistent partition for cookies
      webSecurity: true, // Keep security enabled
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, 'images', 'logo192.png'),
  });

  // Force Origin/Referer for all http/https requests AND auto-attach stored cookies
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => {
      if (!details.url.startsWith('http')) {
        callback({ requestHeaders: details.requestHeaders });
        return;
      }

      const headers = {
        ...details.requestHeaders,
        Origin: FRONTEND_ORIGIN,
        Referer: `${FRONTEND_ORIGIN}/`,
      };

      // If no Cookie header yet, pull cookies from the Electron session for this URL
      if (!headers.Cookie) {
        sess.cookies
          .get({ url: details.url })
          .then((cookies) => {
            if (cookies?.length) {
              const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
              headers.Cookie = cookieString;
              console.log('[Electron webRequest] Injecting cookies into request for', details.url, cookieString);
            } else {
              console.log('[Electron webRequest] No cookies found to inject for', details.url);
            }
            callback({ requestHeaders: headers });
          })
          .catch((err) => {
            console.error('[Electron webRequest] Failed to get cookies for', details.url, err);
            callback({ requestHeaders: headers });
          });
      } else {
        callback({ requestHeaders: headers });
      }
    }
  );

  // Intercept responses to sync cookies from Set-Cookie headers
  mainWindow.webContents.session.webRequest.onHeadersReceived({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
    console.log('[Electron webRequest] Intercepted response from:', details.url);
    const headerKeys = Object.keys(details.responseHeaders || {});
    console.log('[Electron webRequest] Response header keys:', headerKeys.join(', '));
    
    // Extract and store Set-Cookie headers
    const rawSetCookie = details.responseHeaders['set-cookie'] || details.responseHeaders['Set-Cookie'];
    const setCookieHeaders = Array.isArray(rawSetCookie)
      ? rawSetCookie
      : rawSetCookie
      ? [rawSetCookie].flat().filter(Boolean)
      : [];
    
    if (!setCookieHeaders || setCookieHeaders.length === 0) {
      console.log('[Electron] No Set-Cookie headers on response:', details.url);
    }

    if (setCookieHeaders && setCookieHeaders.length > 0) {
      console.log('[Electron] Found Set-Cookie headers:', setCookieHeaders.length, 'cookies');
      
      // Parse and store each cookie
      setCookieHeaders.forEach(async (cookieString) => {
        try {
          console.log('[Electron] Processing cookie string:', cookieString.substring(0, 100) + '...');
          
          // Parse cookie string
          const parts = cookieString.split(';').map(p => p.trim());
          const [nameValue] = parts;
          const [name, value] = nameValue.split('=');
          
          if (!name || !value) {
            console.warn('[Electron] Invalid cookie format:', cookieString);
            return;
          }
          
          const cookie = { name, value: value || '' };
          
          // Parse cookie attributes
          parts.slice(1).forEach(part => {
            const [key, val] = part.split('=').map(s => s?.trim());
            const lowerKey = key?.toLowerCase();
            
            if (lowerKey === 'domain') cookie.domain = val;
            if (lowerKey === 'path') cookie.path = val;
            if (lowerKey === 'expires') cookie.expirationDate = Math.floor(new Date(val).getTime() / 1000);
            if (lowerKey === 'max-age') cookie.expirationDate = Math.floor(Date.now() / 1000) + parseInt(val);
            if (lowerKey === 'secure') cookie.secure = true;
            if (lowerKey === 'httponly') cookie.httpOnly = true;
            if (lowerKey === 'samesite') {
              const normalizedSameSite = (val || '').toLowerCase();
              cookie.sameSite = normalizedSameSite === 'none' ? 'no_restriction' : normalizedSameSite;
            }
          });
          
          // Determine URL for cookie
          const urlObj = new URL(details.url);
          const cookieUrl = `${urlObj.protocol}//${cookie.domain || urlObj.hostname}${cookie.path || '/'}`;

          // If the response is over http, force secure flag off so Electron can send them back
          if (urlObj.protocol === 'http:' && cookie.secure) {
            console.log('[Electron] Stripping secure flag for HTTP response to allow cookie storage');
            cookie.secure = false;
          }
          
          // Set cookie in Electron session
          await mainWindow.webContents.session.cookies.set({
            url: cookieUrl,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || urlObj.hostname,
            path: cookie.path || '/',
            secure: cookie.secure || false,
            httpOnly: cookie.httpOnly || false,
            expirationDate: cookie.expirationDate,
            sameSite: cookie.sameSite || 'lax',
          });
          
          console.log('[Electron] Synced cookie:', cookie.name, 'from', details.url);
          const currentCookies = await mainWindow.webContents.session.cookies.get({ url: cookieUrl });
          console.log('[Electron] Current cookies for', cookieUrl, ':', currentCookies.map(c => c.name).join(', '));
        } catch (error) {
          console.error('[Electron] Failed to parse/store cookie:', error);
        }
      });
    }
    
    // Also set CORS headers for file:// protocol (must not use '*' when sending credentials)
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': [FRONTEND_ORIGIN],
        'Access-Control-Allow-Credentials': ['true'],
        'Access-Control-Allow-Headers': ['*'],
      }
    });
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.destroy();
    }
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // Prevent unsafe keyboard shortcuts in production
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      if (!isDev) event.preventDefault();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'images', 'logo192.png');
  
  // Create proper tray icon for macOS (16x16 for normal, 32x32 for retina)
  let trayIcon;
  try {
    const icon = nativeImage.createFromPath(iconPath);
    // Resize to 16x16 (macOS will scale to 32x32 for retina)
    trayIcon = icon.resize({ 
      width: 16, 
      height: 16,
      quality: 'best'
    });
    // Template image makes it adapt to macOS light/dark theme
    trayIcon.setTemplateImage(true);
  } catch (e) {
    console.error('Failed to create tray icon:', e);
    // Fallback: create a simple icon from path
    const icon = nativeImage.createFromPath(iconPath);
    trayIcon = icon.resize({ width: 16, height: 16 });
  }
  
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'Refresh',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.reload();
        }
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Settings',
      click: () => {
        mainWindow.webContents.send('open-settings');
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit microArt',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('microArt - Always Connected');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.on('ready', async () => {
    console.log('[Electron] ===== APP STARTING =====');
    console.log('[Electron] Platform:', process.platform);
    console.log('[Electron] Electron version:', process.versions.electron);
    console.log('[Electron] Node version:', process.versions.node);
    console.log('[Electron] Notification.isSupported():', Notification.isSupported());
    console.log('[Electron] Dev mode:', isDev);
  
  // Remove quarantine attributes on macOS (both for fresh installs and after updates)
  if (process.platform === 'darwin') {
    log.info('[Electron] macOS detected - removing quarantine attributes for code signature validation');
    try {
      await removeQuarantineAttributes();
    } catch (error) {
      log.error('[Electron] Error removing quarantine attributes:', error);
      // Don't fail the app startup if this fails
    }
  }
  
  // Request notification permission on macOS
  if (process.platform === 'darwin') {
    console.log('[Electron] macOS detected - will request notification permissions');
    
    // Show a test notification after window is ready to trigger permission prompt
    setTimeout(() => {
      if (Notification.isSupported()) {
        console.log('[Electron] Notifications are supported');
        console.log('[Electron] Showing test notification to trigger macOS permission prompt...');
        
        try {
          const testNotification = new Notification({
            title: 'microArt Desktop',
            body: 'Notifications are enabled! You will receive updates here.',
            silent: false,
            icon: path.join(__dirname, 'images', 'logo192.png')
          });
          
          testNotification.on('show', () => {
            console.log('[Electron] Test notification shown successfully');
          });
          
          testNotification.on('failed', (event, error) => {
            console.error('[Electron] Test notification failed:', error);
          });
          
          testNotification.show();
        } catch (error) {
          console.error('[Electron] Failed to create test notification:', error);
        }
      } else {
        console.error('[Electron] Notifications NOT supported on this platform');
      }
    }, 3000); // Wait 3 seconds after app starts
  }
  
  createSplashScreen();
  createWindow();
  createTray();
  setupAutoLaunch();

  // Check for updates
  if (!isDev) {
    try {
      log.info('Checking for updates...');
      const result = await autoUpdater.checkForUpdatesAndNotify();
      if (result) {
        log.info('Update check result:', result?.updateInfo?.version || 'No update available');
      }
    } catch (error) {
      log.error('Error checking for updates:', error);
      updateStatus.lastError = error?.message || String(error);
      // Don't set updateAvailable to false here - let update-not-available event handle it
    }
  } else {
    log.info('Skipping update check in development mode');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-name', () => {
  return 'microArt';
});

// Cookie management handlers
ipcMain.handle('get-cookies', async (event, url) => {
  try {
    const cookies = await mainWindow.webContents.session.cookies.get({ url });
    console.log('[Electron] Retrieved cookies for', url, ':', cookies.map(c => c.name).join(', '));
    return cookies;
  } catch (error) {
    console.error('[Electron] Error getting cookies:', error);
    return [];
  }
});

ipcMain.handle('set-cookie', async (event, details) => {
  try {
    // details should include: url, name, value, domain, path, secure, httpOnly, expirationDate
    await mainWindow.webContents.session.cookies.set(details);
    console.log('[Electron] Set cookie:', details.name, 'for', details.domain);
    return true;
  } catch (error) {
    console.error('[Electron] Error setting cookie:', error);
    return false;
  }
});

ipcMain.handle('remove-cookie', async (event, url, name) => {
  try {
    await mainWindow.webContents.session.cookies.remove(url, name);
    console.log('[Electron] Removed cookie:', name);
    return true;
  } catch (error) {
    console.error('[Electron] Error removing cookie:', error);
    return false;
  }
});

ipcMain.on('app-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('app-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('app-close', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('app-refresh', () => {
  if (mainWindow) {
    mainWindow.webContents.reload();
  }
});

// Auto-launch on startup
function setupAutoLaunch() {
  const autoLaunchEnabled = store.get('autoLaunch', true);

  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: autoLaunchEnabled,
      openAsHidden: true,
    });
  } else if (process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: autoLaunchEnabled,
      openAsHidden: true,
    });
  }
}

ipcMain.handle('set-auto-launch', (event, enabled) => {
  store.set('autoLaunch', enabled);
  setupAutoLaunch();
  return enabled;
});

ipcMain.handle('get-auto-launch', () => {
  return store.get('autoLaunch', true);
});

// Badge count for dock/taskbar icon
ipcMain.handle('set-badge-count', (event, count) => {
  try {
    const badgeCount = parseInt(count) || 0;
    
    if (process.platform === 'darwin') {
      // macOS - set dock badge
      app.dock.setBadge(badgeCount > 0 ? String(badgeCount) : '');
      log.info(`[Badge] macOS dock badge set to: ${badgeCount}`);
    } else if (process.platform === 'win32') {
      // Windows - set overlay icon
      if (mainWindow) {
        if (badgeCount > 0) {
          // Simple text overlay for Windows taskbar
          // Note: This requires a proper icon, so we'll just flash the window instead
          mainWindow.flashFrame(true);
          setTimeout(() => mainWindow.flashFrame(false), 3000);
          log.info(`[Badge] Windows notification count: ${badgeCount} (flashed window)`);
        } else {
          mainWindow.flashFrame(false);
          log.info('[Badge] Windows notification cleared');
        }
      }
    } else if (process.platform === 'linux') {
      // Linux - set badge using libnotify or app indicator (if supported)
      // Most Linux DEs support badge count through Unity launcher API
      if (app.setBadgeCount) {
        app.setBadgeCount(badgeCount);
        log.info(`[Badge] Linux badge set to: ${badgeCount}`);
      }
    }
    
    return { success: true, count: badgeCount };
  } catch (error) {
    log.error('[Badge] Error setting badge count:', error);
    return { success: false, error: error.message };
  }
});

// Update events
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...');
  updateStatus.isChecking = true;
  mainWindow?.webContents.send('update-checking');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info?.version);
  updateStatus.updateAvailable = true;
  updateStatus.updateDownloaded = false;
  updateStatus.lastError = null;
  updateStatus.isChecking = false;
  updateStatus.downloadProgress = 0;
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available. Current version:', info?.version);
  updateStatus.updateAvailable = false;
  updateStatus.updateDownloaded = false;
  updateStatus.isChecking = false;
  mainWindow?.webContents.send('update-not-available', info);
});

autoUpdater.on('download-progress', (progressObj) => {
  const percent = Math.round(progressObj.percent);
  log.info(`Download progress: ${percent}% (${progressObj.transferred}/${progressObj.total})`);
  updateStatus.downloadProgress = percent;
  mainWindow?.webContents.send('update-download-progress', {
    percent,
    transferred: progressObj.transferred,
    total: progressObj.total,
    bytesPerSecond: progressObj.bytesPerSecond,
  });
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info?.version);
  updateStatus.updateAvailable = false;
  updateStatus.updateDownloaded = true;
  updateStatus.lastError = null;
  updateStatus.downloadProgress = 100;
  updateStatus.isChecking = false;
  
  // Remove quarantine attributes immediately after update download on macOS
  // This prevents code signature validation errors when the app is restarted
  if (process.platform === 'darwin') {
    log.info('[Update] macOS detected - removing quarantine attributes after download');
    removeQuarantineAttributes().catch(error => {
      log.error('[Update] Error removing quarantine attributes after update:', error);
      // Don't fail the update process if this fails
    });
  }
  
  mainWindow?.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (error) => {
  log.error('Auto-updater error:', error);
  updateStatus.lastError = error?.message || String(error);
  updateStatus.updateAvailable = false;
  updateStatus.updateDownloaded = false;
  updateStatus.isChecking = false;
  updateStatus.downloadProgress = 0;
  mainWindow?.webContents.send('update-error', { message: error?.message || String(error) });
});

ipcMain.on('restart-app', async () => {
  log.info('========================================');
  log.info('[Update] RESTART REQUESTED BY USER');
  log.info('[Update] Timestamp:', new Date().toISOString());
  log.info('[Update] Update status:', JSON.stringify(updateStatus, null, 2));
  log.info('[Update] App version:', app.getVersion());
  log.info('[Update] Platform:', process.platform);
  log.info('========================================');
  
  // Set quitting flag
  isQuitting = true;
  log.info('[Update] isQuitting flag set to true');
  
  // Give user feedback
  if (mainWindow && !mainWindow.isDestroyed()) {
    log.info('[Update] Sending restart-initiated event to renderer');
    mainWindow.webContents.send('restart-initiated');
  }
  
  try {
    log.info('[Update] Attempting to quit and install update...');
    log.info('[Update] Calling autoUpdater.quitAndInstall(false, true)');
    
    // Close all windows first
    const allWindows = BrowserWindow.getAllWindows();
    log.info('[Update] Closing', allWindows.length, 'windows');
    allWindows.forEach((win, index) => {
      try {
        log.info(`[Update] Closing window ${index + 1}/${allWindows.length}`);
        if (!win.isDestroyed()) {
          win.destroy();
        }
      } catch (err) {
        log.error(`[Update] Error closing window ${index + 1}:`, err);
      }
    });
    
    // Small delay to ensure windows are closed
    await new Promise(resolve => setTimeout(resolve, 100));
    log.info('[Update] Windows closed, proceeding with quitAndInstall');
    
    // Try quitAndInstall with different parameter combinations
    try {
      log.info('[Update] Attempt 1: quitAndInstall(false, true)');
      autoUpdater.quitAndInstall(false, true);
      log.info('[Update] quitAndInstall(false, true) called - waiting for app to quit');
    } catch (err1) {
      log.error('[Update] quitAndInstall(false, true) failed:', err1);
      
      try {
        log.info('[Update] Attempt 2: quitAndInstall(true, true)');
        autoUpdater.quitAndInstall(true, true);
        log.info('[Update] quitAndInstall(true, true) called');
      } catch (err2) {
        log.error('[Update] quitAndInstall(true, true) failed:', err2);
        
        try {
          log.info('[Update] Attempt 3: quitAndInstall() with no params');
          autoUpdater.quitAndInstall();
          log.info('[Update] quitAndInstall() called');
        } catch (err3) {
          log.error('[Update] quitAndInstall() failed:', err3);
          throw err3;
        }
      }
    }
    
    // If we reach here, give some time for the quit to happen
    log.info('[Update] Waiting 500ms for quit to process...');
    await new Promise(resolve => setTimeout(resolve, 500));
    log.info('[Update] Still running after 500ms, forcing app.quit()');
    app.quit();
    
  } catch (error) {
    log.error('========================================');
    log.error('[Update] ✗✗✗ CRITICAL ERROR IN RESTART PROCESS');
    log.error('[Update] Error:', error);
    log.error('[Update] Error stack:', error.stack);
    log.error('[Update] Error message:', error.message);
    log.error('[Update] Error type:', error.constructor.name);
    log.error('========================================');
    
    // Last resort fallback: force quit
    try {
      log.info('[Update] Fallback: Forcing app.quit()');
      app.quit();
    } catch (quitError) {
      log.error('[Update] ✗✗✗ Even app.quit() failed:', quitError);
      log.error('[Update] Attempting app.exit(0)');
      app.exit(0);
    }
  }
});

// Manual check for updates
ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    log.info('Skipping update check in development mode');
    return { success: false, isDev: true, message: 'Update checks disabled in development' };
  }

  try {
    log.info('Manual update check triggered');
    updateStatus.isChecking = true;
    const result = await autoUpdater.checkForUpdates();
    return { 
      success: true, 
      updateInfo: result?.updateInfo,
      currentVersion: app.getVersion(),
    };
  } catch (error) {
    log.error('Manual update check failed:', error);
    updateStatus.lastError = error?.message || String(error);
    updateStatus.isChecking = false;
    return { 
      success: false, 
      error: error?.message || String(error),
      currentVersion: app.getVersion(),
    };
  }
});

// Allow renderer to query update status and optionally trigger a check
ipcMain.handle('get-update-status', async () => {
  const base = {
    ...updateStatus,
    version: app.getVersion(),
    isDev,
  };

  if (isDev) return base;

  try {
    const result = await autoUpdater.checkForUpdates();
    const info = result?.updateInfo;
    return {
      ...base,
      updateInfo: info || null,
      updateAvailable: !!info && info.version !== app.getVersion(),
    };
  } catch (error) {
    log.error('Manual update check failed:', error);
    updateStatus.lastError = error?.message || String(error);
    return { ...base, lastError: updateStatus.lastError };
  }
});

// Handle notification clicks
ipcMain.on('notification-clicked', (event, data) => {
  // Show and focus the main window
  if (mainWindow) {
    // Restore if minimized
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    
    // Show the window (in case it's hidden in tray)
    mainWindow.show();
    
    // Focus the window
    mainWindow.focus();
    
    // On macOS, also bring app to front
    if (process.platform === 'darwin') {
      app.dock.show();
    }
    
    // Navigate to URL if provided
    if (data?.url) {
      mainWindow.webContents.send('navigate-to', data.url);
    }
  }
});

// Handle show notification request from renderer
ipcMain.on('show-notification', (event, notificationData) => {
  // Defensive: ensure fs is available even if module scope failed to load
  const fsSafe = typeof fs !== 'undefined' ? fs : require('fs');
  console.log('[Main] ===== NOTIFICATION REQUEST =====');
  console.log('[Main] Title:', notificationData.title);
  console.log('[Main] Body:', notificationData.body);
  console.log('[Main] Platform:', process.platform);
  console.log('[Main] Notification.isSupported():', Notification.isSupported());
  
  if (!Notification.isSupported()) {
    console.error('[Main] ✗ Notifications are NOT supported on this platform');
    return;
  }
  
  try {
    // Resolve icon path
    let iconPath = path.join(__dirname, 'images', 'logo192.png');
    
    if (notificationData.icon) {
      // Handle different icon path formats
      let customIconPath = notificationData.icon;
      
      // Remove leading slash if present
      if (customIconPath.startsWith('/')) {
        customIconPath = customIconPath.substring(1);
      }
      
      // Try to resolve the path
      const possiblePaths = [
        path.join(__dirname, customIconPath),
        path.join(__dirname, '..', customIconPath),
        path.join(__dirname, 'images', path.basename(customIconPath))
      ];
      
      for (const testPath of possiblePaths) {
        if (fsSafe.existsSync(testPath)) {
          iconPath = testPath;
          console.log('[Main] ✓ Found icon at:', iconPath);
          break;
        }
      }
    }
    
    console.log('[Main] Using icon path:', iconPath);
    
    // Prepare notification options
    const options = {
      title: notificationData.title,
      body: notificationData.body,
      silent: notificationData.silent || false,
      icon: fsSafe.existsSync(iconPath) ? iconPath : undefined
    };
    
    // Add timeoutType for Windows
    if (process.platform === 'win32') {
      options.timeoutType = 'default';
    }
    
    console.log('[Main] Creating notification with options:', {
      ...options,
      icon: options.icon ? 'provided' : 'none'
    });
    
    // Create notification
    const notification = new Notification(options);
    
    // Event handlers
    notification.on('show', () => {
      console.log('[Main] ✓ Notification shown successfully');
    });
    
    notification.on('click', () => {
      console.log('[Main] ✓ Notification clicked');
      
      if (mainWindow) {
        // Restore window if minimized
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        
        // Show and focus window
        mainWindow.show();
        mainWindow.focus();
        
        // Show dock icon on macOS
        if (process.platform === 'darwin') {
          app.dock.show();
        }
        
        // Navigate if URL provided
        if (notificationData.data?.url) {
          console.log('[Main] Navigating to:', notificationData.data.url);
          mainWindow.webContents.send('navigate-to', notificationData.data.url);
        }
      }
    });
    
    notification.on('close', () => {
      console.log('[Main] Notification closed');
    });
    
    notification.on('action', (event, index) => {
      console.log('[Main] Notification action:', index);
    });
    
    notification.on('failed', (event, error) => {
      console.error('[Main] ✗ Notification failed:', error);
    });
    
    // Show the notification
    notification.show();
    console.log('[Main] Notification.show() called');
    
  } catch (error) {
    console.error('[Main] ✗✗✗ EXCEPTION showing notification:', error);
    console.error('[Main] Error stack:', error.stack);
  }
  
  console.log('[Main] ===== END NOTIFICATION REQUEST =====');
});

// Handle notification permission request
ipcMain.handle('request-notification-permission', async () => {
  if (process.platform === 'darwin') {
    // On macOS, we can't programmatically request permission
    // It's requested automatically when first notification is shown
    // Return true to indicate Electron will handle it
    return { granted: true, platform: 'darwin' };
  }
  return { granted: true, platform: process.platform };
});
