
const settingsStmt = db.prepare('SELECT value from settings where key = ?');
const settingsUpsert = db.prepare('INSERT INTO settings (key, value) values (@key, @value) ON CONFLICT (key) DO UPDATE SET value = @value');

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
            settingsUpsert.run({
                key: setting,
                value: value
            });
            if (setting === 'replayPath') {
                console.log('loadReplays');
                ipcRenderer.invoke('loadReplays');
            }
        })
    } else {
        document.getElementById(`${setting}Selector`).addEventListener('input', async () => {
            settingsUpsert.run({
                key: setting,
                value: document.getElementById(`${setting}Selector`).value
            });
        })
    }
}