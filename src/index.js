/* eslint-disable import/no-extraneous-dependencies */
const {
  app,
  BrowserWindow,
  ipcMain,
} = require('electron');

const path = require('path');
const fs = require('fs');
const os = require('os');
const { GridColumnHeadersItemCollection } = require('@mui/x-data-grid');
const db = require('better-sqlite3')('melee.db');
db.pragma('journal_mode = WAL');
// db.pragma('analysis_limit=400');
db.pragma('optimize');
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.maximize();
    mainWindow.show();
  });
  mainWindow.on('closed', () => app.quit());
};

const createInvisWindow = () => {
  let invisWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  invisWindow.loadFile(path.join(__dirname, 'invisRenderer.html'))
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  initDB();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.handle('startDatabaseLoad', async () => {
  createDataWorkers();
});

//on completion of function, we forward it back to the main window
ipcMain.handle('reply', async (event, message) => {
  await mainWindow.webContents.send('reply', message);
});
ipcMain.handle('error', async (event, message) => {
  console.error('ERROR from renderer')
  console.error(message);
});
//gross
//used to be dataWorkers but packing the app into asar didnt play well
//so invisible-electron-windows is the only way i know to do multithreaded
async function createDataWorkers() {
  console.log(BrowserWindow.getAllWindows().length);
  if (BrowserWindow.getAllWindows().length > 1) { return };
  let windowCount = os.cpus().length - 1 || 1;

  const settingsStmt = db.prepare('SELECT value from settings where key = ?')
  const replayPath = settingsStmt.get('replayPath').value;
  const localFiles = await getReplayFiles(replayPath);

  const dbFiles = db.prepare('SELECT name from games');
  const alreadyLoadedFiles = dbFiles.all().map((x) => x.name);

  const files = localFiles.filter((file) => !alreadyLoadedFiles.includes(file.name));

  const max = files.length;
  if (files.length < windowCount) {
    windowCount = 1;
  }
  const range = Math.ceil(max / windowCount);
  const finalRange = range + ((max + 1) % windowCount);
  let fileIndexStart = 0;
  let windowsLoaded = 0;
  if (files.length > 0) {
    let gamesLoaded = 0;
    ipcMain.removeHandler('loaded');
    ipcMain.handle('loaded', (event, args) => {
      //something went wrong
      if (windowsLoaded > windowCount) {return}

      console.log('Loaded!');
      windowsLoaded++;
      let myStart = fileIndexStart;
      let myRange = windowsLoaded === windowCount ? finalRange : range;
      fileIndexStart += range;
      return { start: myStart, range: myRange, files: files }
    })

    ipcMain.removeHandler('gameLoad');
    ipcMain.handle('gameLoad', (event, args) => {
      gamesLoaded++
      mainWindow.webContents.send('gameLoad', { conversionsLoaded: args, gamesLoaded: gamesLoaded, max: max, windowsLoaded: windowsLoaded });
    })

    ipcMain.removeHandler('finish');
    ipcMain.handle('finish', (event, args) => {
      console.log('windows');      
      let win = BrowserWindow.getAllWindows().find(x=>x.webContents.id == event.sender.id);
      //sometimes this throws an error but the window closes anyways...      
      win?.close()
      windowsLoaded--;
      mainWindow.webContents.send('windowCountChange', windowsLoaded)
    })
    for (let i = 0; i < windowCount; i++) {
      createInvisWindow();
    }
  }
}
function initDB() {
  const gameStmt = db.prepare(`CREATE TABLE IF NOT EXISTS games (      
      name NOT NULL,
      path Primary Key)`).run();
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
      ,zeroToDeath
      ,moveString
      ,FOREIGN KEY (filepath) REFERENCES games(path)
  )`).run();
  const movesStmt = db.prepare(`CREATE TABLE IF NOT EXISTS moves (
      conversionMoveId INTEGER Primary Key,
      conversionId,
      moveId,
      frame,
      hitCount,
      damage,
      moveIndex,
      inverseMoveIndex
      ,FOREIGN KEY (conversionId) REFERENCES conversions(id)
  )`).run();
  const settingsStmt = db.prepare(`CREATE TABLE IF NOT EXISTS settings (
    key Primary Key,
    value
  )`).run();
  const playlistStmt = db.prepare(`CREATE TABLE IF NOT EXISTS playlists (
    name Primary Key
  )`).run();
  const playlistConversionStmt = db.prepare(`CREATE TABLE IF NOT EXISTS playlistConversion (
    playlistName,
    conversionId,
    playlistPosition,
    PRIMARY KEY (playlistName, conversionId),
    FOREIGN KEY (playlistName) REFERENCES playlists(name),
    FOREIGN KEY (conversionId) REFERENCES conversions(id)
  )`).run();

  // db.prepare('CREATE INDEX IF NOT EXISTS search_index_2 ON conversions (attackingPlayer, attackingCharacter, defendingPlayer, defendingCharacter, stage, percent, moveCount, didKill)').run();
  // db.prepare('CREATE INDEX IF NOT EXISTS count_index ON conversions (id)').run();
  // db.prepare('CREATE INDEX IF NOT EXISTS attacking_index ON conversions (attackingPlayer)').run();
  // db.prepare('CREATE INDEX IF NOT EXISTS defending_index ON conversions (defendingPlayer)').run();
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
