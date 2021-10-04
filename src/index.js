const {
  app,
  BrowserWindow,
  ipcMain
} = require('electron');
const {
  Worker,
  isMainThread,
  parentPort,
  workerData
} = require('worker_threads');

const path = require('path');
const db = require('./database');
const fs = require('fs');
const os = require('os');
const sqliteDB = require('better-sqlite3')('melee.db');
sqliteDB.pragma('journal_mode = WAL');
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

var threads = new Set();
var mainWindow;

const createDataRenderers = async () => {
  //reserve 1 thread for main renderer
  const threadCount = os.cpus().length - 1;

  const config = await db.getAll('configuration');
  const replayPath = config.find(x => x.configId == 'replayPath').value;
  const files = await getReplayFiles(replayPath);
  const max = files.length;
  const range = Math.ceil(max / threadCount);
  let start = 0;
  for (let i = 0; i < threadCount; i++) {
    //last thread takes whatever couldnt be evenly divided
    let message = i == threadCount - 1 ? {
      start: start,
      range: range + ((max + 1) % threadCount),
      files: files
    } : {
      start: start,
      range: range,
      files: files
    }

    let win = createDataRenderer();
    win.once('ready-to-show', () => {
      win.send('execute', message);
    })
    threads.add(win);

    start += range;
  }
}


function createDataRenderer() {
  const dataRenderer = new BrowserWindow({
    show: true, //false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false
    }
  });
  dataRenderer.loadFile(path.join(__dirname, 'dataRenderer.html'));
  dataRenderer.webContents.openDevTools();

  return dataRenderer;
}

const createInvisibleWindow = () => {
  const invisbleWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false
    }
  });

  invisbleWindow.loadFile(path.join(__dirname, 'invisible.html'));
  invisbleWindow.webContents.openDevTools();
  return invisbleWindow;
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  //previous
  // startWindowAndExecuteFunction({
  //   name: 'startDatabaseLoading'
  // });

  //new
  // createDataRenderers();
  createDataWorkers();
  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

const createSettingsWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });
  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'settings.html'));
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  initDB();
  //rename db -> settings/config
  db.createDatabase();
  isConfigValid().then((isConfigValid) => {
    if (isConfigValid) {
      createWindow();
    } else {
      createSettingsWindow();
    }
  });
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


//renderer sends in a function with args
//we open a window - but if we message it right away it sometimes doesn't get the message and the window just sits there
function startWindowAndExecuteFunction(message) {
  let win = createInvisibleWindow();
  win.once('ready-to-show', () => {
    win.send('execute', message);
  })
}

ipcMain.handle('execute', async (event, message) => {
  startWindowAndExecuteFunction(message);
})

ipcMain.handle('ready', async (event, message) => {
  let sender = event.sender.getOwnerBrowserWindow();
  sender.send('execute', tasks.get(sender.id));
  tasks.delete(sender.id);
})

ipcMain.handle('changeWindow', async (event, message) => {
  console.log(message);
  mainWindow.loadFile(path.join(__dirname, `${message.window}.html`));
})
//on completion of function, we forward it back to the main window
ipcMain.handle('reply', async (event, message) => {
  await mainWindow.webContents.send('reply', message);
})

async function isConfigValid() {
  try {
    let config = await db.getAll('configuration');
    //melee iso, playback slippi, replay path

    let replayPath = config.find(x => x.configId == 'replayPath').value;
    let files = await getFiles(replayPath);
    let regExp = /.*\.slp$/;
    let fileCount = files.filter(file => regExp.test(file.name)).length;
    if (fileCount <= 0) {
      return false;
    }

    let isoPath = config.find(x => x.configId == 'isoPath').value;
    let playbackPath = config.find(x => x.configId == 'playbackPath').value;
    return true;
  } catch (e) {
    return false;
  }
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

async function createDataWorkers() {
  const threadCount = os.cpus().length - 1;
  console.log(`threadcount: ${threadCount}`);

  const config = await db.getAll('configuration');
  const replayPath = config.find(x => x.configId == 'replayPath').value;
  const localFiles = await getReplayFiles(replayPath);

  const getFiles = sqliteDB.prepare("SELECT name from games");
  const alreadyLoadedFiles = getFiles.all().map(x => x.name);

  const files = localFiles.filter(file => !alreadyLoadedFiles.includes(file.name));
  console.log(files.length);

  const max = files.length;
  const range = Math.ceil(max / threadCount);
  const finalRange = range + ((max + 1) % threadCount);
  let start = 0;
  if (files.length > 0) {
    for (let i = 0; i < threadCount; i++) {
      const myStart = start;
      //final worker has to take remainder
      const myRange = i == threadCount - 1 ? finalRange : range;
      console.log({
        myStart,
        myRange
      })
      threads.add(new Worker('./src/dataWorker.js', {
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
        console.log(msg);
      })
    }
  }
}

function initDB() {
  const gameStmt = sqliteDB.prepare(`CREATE TABLE IF NOT EXISTS games (      
      name NOT NULL,
      path Primary Key)`);
  const conversionStmt = sqliteDB.prepare(`CREATE TABLE IF NOT EXISTS conversions (
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
      ,FOREIGN KEY (filepath) REFERENCES games(path)
  )`);
  const movesStmt = sqliteDB.prepare(`CREATE TABLE IF NOT EXISTS moves (
      conversionMoveId INTEGER Primary Key,
      conversionId,
      moveId,
      frame,
      hitCount,
      damage
      ,FOREIGN KEY (conversionId) REFERENCES conversions(id)
  )`);
  gameStmt.run();
  conversionStmt.run();
  movesStmt.run();
}