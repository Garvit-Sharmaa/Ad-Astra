const { app, BrowserWindow, shell, screen } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

/**
 * AD ASTRA ELECTRON ENTRY POINT
 * This file handles the native Windows window and spawns the Node.js backend.
 */

// Determine if we are in development mode
const isDev = !app.isPackaged;

let mainWindow;
let serverProcess;

// Request a single instance lock to prevent multiple apps running at once.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // If a second instance is launched, focus the existing window.
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // App lifecycle events
  app.whenReady().then(() => {
    startServer();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

/**
 * Creates the primary application window.
 */
function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(width, 1400),
    height: Math.min(height, 900),
    minWidth: 400,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    // Use the branding icon
    icon: path.join(__dirname, '../dist/favicon.ico'), 
  });

  // Remove default menu for a professional app feel
  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    // In dev, connect to the Vite development server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the local bundled HTML file
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
        console.error('CRITICAL: Failed to load index.html:', err);
    });
  }

  // Intercept links to open in the user's default browser (Chrome/Edge) instead of the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

/**
 * Spawns the Node.js backend server in production.
 */
function startServer() {
  if (isDev) {
    console.log('🚀 Developer Mode: Skipping internal backend spawn. Run "npm run dev:server" manually.');
    return;
  }

  console.log('📡 Starting Ad Astra Production Backend...');

  // Path resolution for electron-builder (unpacked server directory)
  let serverPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'dist', 'index.js');

  // Fallback for different build structures
  if (!fs.existsSync(serverPath)) {
    serverPath = path.join(__dirname, '../server/dist/index.js');
  }

  if (fs.existsSync(serverPath)) {
    // Fork a child process to run the server independently of the UI thread
    serverProcess = fork(serverPath, [], {
      env: { 
        ...process.env, 
        NODE_ENV: 'production',
        PORT: '3005' // Ensure it matches the frontend's constant
      },
      stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
      console.error('🔥 Backend Server Crash:', err);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Backend server exited with code ${code}`);
    });
  } else {
    console.error('🚨 ERROR: Backend server entry point not found at:', serverPath);
  }
}

app.on('window-all-closed', () => {
  // Standard Windows behavior: Close app when windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // CRITICAL: Force kill the backend process on exit.
  // Without this, the server stays running in the background, locking files
  // and preventing the app from being updated or restarted.
  if (serverProcess) {
    console.log('🛑 Shutting down backend services...');
    serverProcess.kill();
    serverProcess = null;
  }
});