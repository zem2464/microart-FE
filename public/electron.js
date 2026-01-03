const { app, BrowserWindow, Menu, ipcMain, Tray, dialog, nativeImage, systemPreferences, Notification } = require('electron');
const isDev = require('electron-is-dev');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');

const store = new Store();
let mainWindow;
let tray;
let isQuitting = false;
let splashWindow;

// Configure auto-updater logging
Object.assign(console, log.functions);
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Handle Squirrel events on Windows
if (process.platform === 'win32' && require('electron-squirrel-startup')) {
  app.quit();
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
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false, // Disable sandbox to allow preload script to use Node.js modules
    },
    icon: path.join(__dirname, 'images', 'logo192.png'),
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

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
      await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      log.error('Error checking for updates:', error);
    }
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

// Update events
autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded');
});

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});

// Check update status
ipcMain.handle('get-update-status', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      updateAvailable: result?.updateInfo ? true : false,
      version: app.getVersion(),
    };
  } catch (error) {
    log.error('Error checking updates:', error);
    return { updateAvailable: false, version: app.getVersion() };
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
