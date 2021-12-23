/* eslint-disable import/no-extraneous-dependencies */
const {
  app,
  BrowserWindow,
  ipcMain,
} = require('electron');
const {
  Worker,
} = require('worker_threads');

const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('better-sqlite3')('melee.db');

db.pragma('journal_mode = WAL');
// db.pragma('analysis_limit=400');
db.pragma('optimize');
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const threads = new Set();
let mainWindow;
let invisWindow;

app.on('before-quit', () => {
  threads.forEach((worker) => worker.postMessage('exit'));
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('did-finish-load', () => {
  });
  // Open the DevTools.
};


const createInvisWindow = () => {
  invisWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      
    }
  })
  invisWindow.loadFile(path.join(__dirname, 'preloadRenderer.html'))
  invisWindow.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  initDB();
  createInvisWindow();
  createWindow();
  createDataWorkers();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.handle('loadReplays', async () => {
  createDataWorkers();
});

//on completion of function, we forward it back to the main window
ipcMain.handle('reply', async (event, message) => {
  await mainWindow.webContents.send('reply', message);
});

async function createDataWorkers() {
  if (threads.length > 1) { return; }

  const threadCount = os.cpus().length - 1;
  console.log(`threadcount: ${threadCount}`);

  const settingsStmt = db.prepare('SELECT value from settings where key = ?')
  const replayPath = settingsStmt.get('replayPath').value;
  const localFiles = await getReplayFiles(replayPath);

  const dbFiles = db.prepare('SELECT name from games');
  const alreadyLoadedFiles = dbFiles.all().map((x) => x.name);

  const files = localFiles.filter((file) => !alreadyLoadedFiles.includes(file.name));
  console.log(files.length);

  const max = files.length;
  const range = Math.ceil(max / threadCount);
  const finalRange = range + ((max + 1) % threadCount);
  let start = 0;
  if (files.length > 0) {
    mainWindow.webContents.send('startGameLoading', files.length);
    for (let i = 0; i < threadCount; i++) {
      const myStart = start;
      // final worker has to take remainder
      const myRange = i == threadCount - 1 ? finalRange : range;
      console.log({
        myStart,
        myRange
      })
      threads.add(new Worker(path.join(__dirname, 'dataWorker.js'), {
        workerData: {
          start: myStart,
          range: myRange,
          files: files
        }
      }));
      start += range;
    }
    for (let worker of threads) {
      worker.on('exit', () => {
        threads.delete(worker);
        console.log(`Thread exiting, ${threads.size} running...`);
      });
      worker.on('message', (msg) => {
        mainWindow.webContents.send('gameLoaded');
      })
    }
  }
}

function initDB() {
  const gameStmt = db.prepare(`CREATE TABLE IF NOT EXISTS games (      
      name NOT NULL,
      path Primary Key)`);
  const conversionStmt = db.prepare(`CREATE TABLE IF NOT EXISTS conversions (
      id Primary Key,
      playerIndex,
      opponentIndex
      ,startFrame
      ,endFrame
      ,startPercent
      ,currentPercent
      ,endPercent
      ,didKill
      ,openingType
      ,attackingPlayer
      ,defendingPlayer
      ,attackingCharacter
      ,defendingCharacter
      ,stage
      ,percent
      ,time
      ,filepath
      ,moveCount
      ,startAt
      ,FOREIGN KEY (filepath) REFERENCES games(path)
  )`);
  const movesStmt = db.prepare(`CREATE TABLE IF NOT EXISTS moves (
      conversionMoveId INTEGER Primary Key,
      conversionId,
      moveId,
      frame,
      hitCount,
      damage,
      moveIndex
      ,FOREIGN KEY (conversionId) REFERENCES conversions(id)
  )`);
  const settingsStmt = db.prepare(`CREATE TABLE IF NOT EXISTS settings (
    key Primary Key,
    value
  )`);
  const playlistStmt = db.prepare(`CREATE TABLE IF NOT EXISTS playlists (
    name Primary Key
  )`);
  const playlistConversionStmt = db.prepare(`CREATE TABLE IF NOT EXISTS playlistConversion (
    playlistName,
    conversionId,
    playlistPosition,
    PRIMARY KEY (playlistName, conversionId),
    FOREIGN KEY (playlistName) REFERENCES playlists(name),
    FOREIGN KEY (conversionId) REFERENCES conversions(id)
  )`);
  
  gameStmt.run();
  conversionStmt.run();
  movesStmt.run();
  settingsStmt.run();
  playlistStmt.run();
  playlistConversionStmt.run();
  let indexStmt = db.prepare('CREATE INDEX IF NOT EXISTS search_index ON conversions (didKill, openingType, attackingPlayer, defendingPlayer, attackingCharacter, defendingCharacter, stage, percent, time, moveCount, startAt)').run();

}

//get all files in all subdirectories
async function getFiles(path = "./") {
  const entries = fs.readdirSync(path, {
    withFileTypes: true
  });
  // Get files within the current directory and add a path key to the file objects
  const files = entries
    .filter(file => !file.isDirectory())
    .map(file => ({
      ...file,
      path: path + file.name
    }));

  // Get folders within the current directory
  const folders = entries.filter(folder => folder.isDirectory());

  for (const folder of folders)
    /*
      Add the found files within the subdirectory to the files array by calling the
      current function itself
    */
    files.push(...await getFiles(`${path}${folder.name}/`));

  return files;
}

async function getReplayFiles(path) {
  let files = await getFiles(path);
  //ends in .slp
  let regExp = /.*\.slp$/;
  let replays = files.filter(file => regExp.test(file.name));
  return replays;
}