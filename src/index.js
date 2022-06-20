/* eslint-disable import/no-extraneous-dependencies */
const {
  app,
  BrowserWindow,
  ipcMain,
} = require('electron');

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

let mainWindow;
let searchWindow;
const createWindow = () => {
  mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));  
  mainWindow.on('closed', () => app.quit());
  //using did-load means components will still be loading when window is visible
  ipcMain.on('windowLoaded', (event, args) => {
    mainWindow.maximize();
    mainWindow.show();
  })
};

const createInvisWindow = (start, range, files) => {
  let invisWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  invisWindow.loadFile(path.join(__dirname, 'invisRenderer.html'))
  invisWindow.webContents.once('did-finish-load', () => {
    invisWindow.webContents.send('startLoad', { start: start, range: range, files: files })
  })
}

const createInvisSearchWindow = (query, queryObject) => {
  let invisWindow = new BrowserWindow({
    // show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  invisWindow.loadFile(path.join(__dirname, 'invisRenderer.html'))
  invisWindow.webContents.once('did-finish-load', () => {
    invisWindow.webContents.openDevTools();
    invisWindow.webContents.send('search', { query, queryObject })
  })
  return invisWindow;
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  initDB();
  //testing shows the first DB call is slow, but others are fast
  //attempt to warm up cache - doesnt seem to work?
  // const startupQuery = 'SELECT COUNT(*) FROM conversions'
  // searchWindow = createInvisSearchWindow(startupQuery);  
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
  return await createDataWorkers();
});

//on completion of function, we forward it back to the main window
ipcMain.handle('reply', async (event, message) => {
  await mainWindow.webContents.send('reply', message);
});

var dataLoadInProgress = false;
var maxGamesToLoad = 0;
var gamesLoaded = 0;
async function createDataWorkers() {
  if (dataLoadInProgress) {
    return { max: maxGamesToLoad, gamesLoaded: gamesLoaded };
  }
  dataLoadInProgress = true;
  maxGamesToLoad = 0;
  gamesLoaded = 0;

  const settingsStmt = db.prepare('SELECT value FROM settings WHERE key = ?')
  const replayPath = settingsStmt.get('replayPath').value;
  const localFiles = await getReplayFiles(replayPath);

  const dbFiles = db.prepare('SELECT name FROM games').all().map((x) => x.name);
  const errorFiles = db.prepare('SELECT name FROM errorGame').all().map((x) => x.name);
  const alreadyLoadedFiles = dbFiles.concat(errorFiles);
  const files = localFiles.filter((file) => !alreadyLoadedFiles.includes(file.name));
  maxGamesToLoad = files.length;
  //just picking a random number
  let windowCount = maxGamesToLoad < 10 ? 1 : (os.cpus().length || 1);

  if (maxGamesToLoad > 0) {
    let fileIndexStart = 0;
    const range = Math.ceil(maxGamesToLoad / windowCount);
    const finalRange = range + ((maxGamesToLoad + 1) % windowCount);
    for (let i = 0; i < windowCount; i++) {
      let fileRange = i + 1 === windowCount ? finalRange : range
      createInvisWindow(fileIndexStart, fileRange, files);
      fileIndexStart += fileRange;
    }
  }
  return { max: maxGamesToLoad, gamesLoaded: gamesLoaded };
}

ipcMain.handle('gameLoad', (event, args) => {
  gamesLoaded++
  mainWindow.webContents.send('gameLoad', { gamesLoaded: gamesLoaded });
})

ipcMain.handle('finish', (event, args) => {
  let win = BrowserWindow.getAllWindows().find(x => x.webContents.id == event.sender.id);
  //sometimes this throws an error but the window closes anyways...      
  win?.close()
  let openWindowCount = BrowserWindow.getAllWindows().length;
  if (openWindowCount === 1 ||
    (searchWindow && openWindowCount === 2)) { dataLoadInProgress = false };
})



ipcMain.on('searchFinish', (event, args) => {
  mainWindow.webContents.send('updateSearch', args);
  let win = BrowserWindow.getAllWindows().find(x => x.webContents.id == event.sender.id);
  //sometimes this throws an error but the window closes anyways...      
  // win?.close()
  // searchWindow = ''
})
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
      ,damagePerFrame
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
  const errorGameStmt = db.prepare(`CREATE TABLE IF NOT EXISTS errorGame (
    name NOT NULL,
    Path Primary Key,
    reason
  )`).run();
  db.prepare('CREATE INDEX IF NOT EXISTS search_index_2 ON conversions (attackingPlayer, attackingCharacter, defendingPlayer, defendingCharacter, stage, percent, moveCount, didKill)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS count_index ON conversions (id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS attacking_index ON conversions (attackingPlayer)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS defending_index ON conversions (defendingPlayer)').run();
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
