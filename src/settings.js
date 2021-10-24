const settingsStmt = db.prepare('SELECT value from settings where key = ?');
const settingsInsert = db.prepare('INSERT INTO settings (key, value) values (@key, @value) ON CONFLICT (key) DO UPDATE SET value = @value');

const settings = ['replayPath', 'isoPath', 'playbackPath', 'preRoll', 'postRoll', 'obsPassword', 'obsPort'];

//TODO create better framework for settings/config
document.addEventListener("DOMContentLoaded", async function () {
    for (let setting of settings) {
        try {
            if (setting.includes('Path')) {
                document.getElementById(setting).innerHTML = settingsStmt.get(setting).value;
            } else {
                document.getElementById(`${setting}Selector`).value = settingsStmt.get(setting).value;

            }
        } catch (e) {
            console.log(e)
        };
    }
});

for (let setting of settings) {
    if (setting.includes('Path')) {
        document.getElementById(`${setting}Selector`).addEventListener('change', async () => {
            let path = document.getElementById(`${setting}Selector`).files[0].path;
            let value = path;
            if (setting === 'replayPath') {
                const regExp = /(.*\\)/;
                const match = regExp.exec(path)[0];
                value = match;
            }
            document.getElementById(setting).innerHTML = value;
            settingsInsert.run({
                key: setting,
                value: value
            });
        })
    } else {
        document.getElementById(`${setting}Selector`).addEventListener('input', async () => {
            settingsInsert.run({
                key: setting,
                value: document.getElementById(`${setting}Selector`).value
            });
        })
    }
}

// for (let elementId of elementIds) {
//     document.querySelector('#'+elementId+'Selector').addEventListener('change', async () => {     
//         let path = document.getElementById(elementId+'Selector').files[0].path;        
//         console.log(path);
//         let value = path;
//         if (elementId === 'replay') {
//             const regExp = /(.*\\)/;
//             const match = regExp.exec(path)[0];
//             value = match;
//         }
//         document.getElementById(elementId+'Path').innerHTML = value;

//         settingsInsert.run({key: elementId+'Path', value: value});
//     })
// }