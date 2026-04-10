const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;

const isDev = !app.isPackaged;
const PORT = 3100;

function startNextServer() {
  return new Promise((resolve) => {
    if (isDev) {
      resolve();
      return;
    }
    const serverPath = path.join(process.resourcesPath, 'app');
    nextProcess = spawn('node', [path.join(serverPath, 'node_modules/.bin/next'), 'start', '-p', PORT], {
      cwd: serverPath,
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'pipe',
    });
    nextProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Ready')) resolve();
    });
    nextProcess.stderr.on('data', () => {});
    setTimeout(resolve, 5000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'WES Job Cost',
    backgroundColor: '#0d0d0d',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  const url = isDev
    ? 'http://localhost:3000'
    : `http://localhost:${PORT}`;

  mainWindow.loadURL(url);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  await startNextServer();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (nextProcess) nextProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
