const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database');
const fs = require ('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

var tasks = new Map();
var mainWindow;


const createInvisibleWindow = () => {
  const invisbleWindow = new BrowserWindow( {
    //show:false,
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
  startWindowAndExecuteFunction({name: 'startDatabaseLoading'}
  );
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

ipcMain.handle('execute', async(event, message)=> {  
  startWindowAndExecuteFunction(message);
}) 

ipcMain.handle('ready', async(event, message) => {
  let sender = event.sender.getOwnerBrowserWindow();
  sender.send('execute', tasks.get(sender.id));
  tasks.delete(sender.id);
})

ipcMain.handle('changeWindow', async(event, message) => {
  console.log(message);
  mainWindow.loadFile(path.join(__dirname, `${message.window}.html`));
})
//on completion of function, we forward it back to the main window
ipcMain.handle('reply', async(event, message)=> {
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
    if (fileCount <= 0 ) {
      return false;
    }

    let isoPath = config.find(x=>x.configId == 'isoPath').value;
    let playbackPath = config.find(x=>x.configId == 'playbackPath').value;
    return true;
  } catch (e) {
    return false;
  }
}


//get all files in all subdirectories
async function getFiles(path = "./") {
  const entries = fs.readdirSync(path, { withFileTypes: true });
  // Get files within the current directory and add a path key to the file objects
  const files = entries
      .filter(file => !file.isDirectory())
      .map(file => ({ ...file, path: path + file.name }));

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