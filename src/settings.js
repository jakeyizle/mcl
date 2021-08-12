const { ipcRenderer } = require('electron');
const db = require('./database');

function changeWindow() {
    ipcRenderer.invoke('changeWindow', {
        'window': 'index'
    });
}
//TODO create better framework for settings/config
document.addEventListener("DOMContentLoaded", async function() {
    try {
        let config = await db.getAll('configuration');    
        document.getElementById('replayPath').innerHTML = config.find(x=>x.configId == 'replayPath').value || '';
        document.getElementById('isoPath').innerHTML = config.find(x=>x.configId == 'isoPath').value || ''
        document.getElementById('playbackPath').innerHTML = config.find(x=>x.configId == 'playbackPath').value || ''
    } catch (e) {
        //to suppress error logs when config is empty
    }
});

document.querySelector('#replaySelector').addEventListener('change', async () => {    
    // let files = Array.from(document.getElementById('replaySelector').files);
    // files.sort((a, b) => a.path.match(/\\/g).length - b.path.match(/\\/g).length);
    let path = document.getElementById('replaySelector').files[0].path;
    const regExp = /(.*\\)/;
    const match = regExp.exec(path)[0];
    console.log(match);    
    document.getElementById('replayPath').innerHTML = match;
    await db.upsertRow('configuration', {configId: 'replayPath'}, {'value': match}, {configId: 'replayPath', value:match});
  })

  document.querySelector('#isoSelector').addEventListener('change', async () => {    
    let path = document.getElementById('isoSelector').files[0].path;
    console.log(path);    
    document.getElementById('isoPath').innerHTML = path;
    await db.upsertRow('configuration', {configId: 'isoPath'}, {'value': path}, {configId: 'isoPath', value:path});
  })

  document.querySelector('#playbackSelector').addEventListener('change', async () => {    
    let path = document.getElementById('playbackSelector').files[0].path;
    console.log(path);    
    document.getElementById('playbackPath').innerHTML = path;
    await db.upsertRow('configuration', {configId: 'playbackPath'}, {'value': path}, {configId: 'playbackPath', value:path});
  })

