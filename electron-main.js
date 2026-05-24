const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Remove native frame menu bar for a cleaner, premium whiteboard feel
  win.setMenuBarVisibility(false);

  // Load local compiled assets index.html from Vite
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

// Disable hardware acceleration warning/issues if any, and wait for ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
