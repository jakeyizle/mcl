const { ipcRenderer } = require('electron');
const db = require('better-sqlite3')('melee.db');

const settingsStmt = db.prepare('SELECT value from settings where key = ?');
const settingsInsert = db.prepare('INSERT INTO settings (key, value) values (@key, @value) ON CONFLICT (key) DO UPDATE SET value = @value');
const elementIds = ['replay', 'iso', 'playback'];

function changeWindow() {
    ipcRenderer.invoke('changeWindow', {
        'window': 'index'
    });
}
//TODO create better framework for settings/config
document.addEventListener("DOMContentLoaded", async function() {
        for (let elementId of elementIds) {
            try {        
            console.log(settingsStmt.get(elementId+'Path'));
            document.getElementById(elementId+'Path').innerHTML = settingsStmt.get(elementId+'Path').value;
            
        } catch (e) {
            //to suppress error logs when config is empty
            console.log(e);
            console.log('error :(');
        }
    }
});

for (let elementId of elementIds) {
    document.querySelector('#'+elementId+'Selector').addEventListener('change', async () => {     
        let path = document.getElementById(elementId+'Selector').files[0].path;        
        console.log(path);
        let value = path;
        if (elementId === 'replay') {
            const regExp = /(.*\\)/;
            const match = regExp.exec(path)[0];
            value = match;
        }
        document.getElementById(elementId+'Path').innerHTML = value;
        
        settingsInsert.run({key: elementId+'Path', value: value});
    })
}


// document.querySelector('#replaySelector').addEventListener('change', async () => {    
//     // let files = Array.from(document.getElementById('replaySelector').files);
//     // files.sort((a, b) => a.path.match(/\\/g).length - b.path.match(/\\/g).length);
//     let path = document.getElementById('replaySelector').files[0].path;
//     const regExp = /(.*\\)/;
//     const match = regExp.exec(path)[0];
//     console.log(match);    
//     document.getElementById('replayPath').innerHTML = match;
//     await db.upsertRow('configuration', {configId: 'replayPath'}, {'value': match}, {configId: 'replayPath', value:match});
//   })

//   document.querySelector('#isoSelector').addEventListener('change', async () => {    
//     let path = document.getElementById('isoSelector').files[0].path;
//     console.log(path);    
//     document.getElementById('isoPath').innerHTML = path;
//     await db.upsertRow('configuration', {configId: 'isoPath'}, {'value': path}, {configId: 'isoPath', value:path});
//   })

//   document.querySelector('#playbackSelector').addEventListener('change', async () => {    
//     let path = document.getElementById('playbackSelector').files[0].path;
//     console.log(path);    
//     document.getElementById('playbackPath').innerHTML = path;
//     await db.upsertRow('configuration', {configId: 'playbackPath'}, {'value': path}, {configId: 'playbackPath', value:path});
//   })

