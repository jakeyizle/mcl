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
