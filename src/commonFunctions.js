const path = require('path');
const fs = require('fs');
const {
    exec,
    spawn,
    spawnSync
} = require('child_process');
const { _ } = require('lodash')
// const crypto = require('crypto');
const OBSWebsocket = require('obs-websocket-js');
const { resolve } = require('path');
const db = require('better-sqlite3')('melee.db');
const settingsStmt = db.prepare('SELECT value from settings where key = ?');

exports.playConversions = async function playAndRecordConversions(conversions, recordConversions, recordingName) {
    let command = getReplayCommand(conversions);

    if (!recordConversions) {
        disableOrEnableDolphinRecording(false);
        playConversions(command);
    }
    else {
        const recordMethod = settingsStmt.get('recordMethod')?.value;
        console.log(recordMethod)
        if (recordMethod === 'Dolphin') {
            disableOrEnableDolphinRecording(true);
            const folderPath = getPlaybackFolder()
            const dumpPath = 'User\\Dump\\Frames';
            const movieFolderPath = folderPath + dumpPath
            const movieDump = '\\framedump0.avi'            
            const fullPath = movieFolderPath + movieDump;
            //its possible someone didnt do cleanup themselves - lets get rid of it
            if (fs.existsSync(fullPath)) {
                let date = new Date().toJSON().replaceAll(':', '');
                fs.renameSync(fullPath, movieFolderPath+`\\${date}.avi`)
            }
            await playConversions(command);
            let renameLoop = true;
            //file gets locked for a little bit after dolphin closes
            let fileName = recordingName || new Date().toJSON().replaceAll(':', '');
            while (renameLoop) {
                try {
                    fs.renameSync(fullPath, movieFolderPath+`\\${fileName}.avi`)
                    renameLoop = false;
                } catch (e) {}               
            }
        } else if (recordMethod === 'OBS') {
            disableOrEnableDolphinRecording(false);
            recordReplayWithOBS(command);
            //todo rename file
        } else { throw `Bad Recording Parameter` }
    }
}

async function playConversions(replayCommand) {
    return new Promise((resolve, reject) => { 
    var dolphinProcess = exec(replayCommand);
     dolphinProcess.stdout.on('data', (line) => {
        if (line.includes('[NO_GAME]')) {
            spawnSync("taskkill", ["/pid", dolphinProcess.pid, '/f', '/t']);
            resolve();
        }   
    })
})
}
function getReplayCommand(conversions) {
    const playbackPath = settingsStmt.get('dolphinPath').value;
    const isoPath = settingsStmt.get('isoPath').value;
    const preRoll = settingsStmt.get('preRoll')?.value || 0;
    const postRoll = settingsStmt.get('postRoll')?.value || 0;
    var output = {
        "mode": "queue",
        "replay": "",
        "isRealTimeMode": false,
        "outputOverlayFiles": true,
        "queue": []
    };
    for (let conversion of conversions) {
        let startFrame = conversion.startFrame - preRoll;
        //javascript is fun (:
        let endFrame = conversion.endFrame + parseInt(postRoll);
        var queueMessage = {
            "path": conversion.filepath,
            "startFrame": startFrame,
            "endFrame": endFrame
        };
        output.queue.push(queueMessage);
    }
    let jsonPath = __dirname.includes('app.asar')
        ? path.join(__dirname, '..', '..', 'tempMoments.json')
        : path.join(__dirname, "tempMoments.json");
    //if i use the json directly it doesnt work, so have to write it to a file first
    fs.writeFileSync(jsonPath, JSON.stringify(output));
    //pretty sure only the -i and -e are needed?
    return `"${playbackPath}" -i "${jsonPath}" -b -e "${isoPath}" --cout`;
}

async function recordReplayWithOBS(replayCommand) {
    try {
        const obsPassword = settingsStmt.get('obsPassword').value;
        const obsPort = settingsStmt.get('obsPort').value;
        const obs = new OBSWebsocket();
        obs.connect({ address: `localhost:${obsPort}`, password: obsPassword });
        let startFrame;
        let endFrame;
        let currentFrame;
        let recordingStarted;
        let fileName;

        var dolphinProcess = exec(replayCommand)
        dolphinProcess.stdout.on('data', (line) => {
            const commands = _.split(line, "\r\n");
            _.each(commands, async (command) => {
                command = _.split(command, " ");
                // console.log(command);
                if (command[0] === '[PLAYBACK_START_FRAME]') {
                    startFrame = parseInt(command[1]);
                }
                if (command[0] === '[PLAYBACK_END_FRAME]') {
                    endFrame = parseInt(command[1]);
                }
                if (command[0] === '[CURRENT_FRAME]') {
                    currentFrame = parseInt(command[1]);
                    if (currentFrame == startFrame) {
                        if (!recordingStarted) {
                            console.log('start record');
                            await obs.send("StartRecording");
                            recordingStarted = true;
                        } else {
                            console.log('resume record');
                            obs.send("ResumeRecording").catch((err) => console.log(err));
                        }
                    }
                    if (currentFrame == endFrame) {
                        console.log('pauseRecord');
                        obs.send("PauseRecording").catch((err) => console.log(err));
                    }
                }
                if (command[0] === '[NO_GAME]') {
                    console.log('stopRecord');
                    let recordingStatus = await obs.send("GetRecordingStatus");
                    fileName = recordingStatus.recordingFilename;
                    console.log(fileName);
                    await obs.send("StopRecording");
                    spawnSync("taskkill", ["/pid", dolphinProcess.pid, '/f', '/t']);
                    recordingStarted = false;
                }
            });
        })
    } catch (e) {
        console.log(e);
    }
}

function disableOrEnableDolphinRecording(enable = false) {
    const folderPath = getPlaybackFolder()
    const configPath = 'User\\Config\\Dolphin.ini';
    const fullPlaybackPath = folderPath + configPath;

    const settingsRegExp = /(DumpFrames =).*/;
    const config = fs.readFileSync(fullPlaybackPath, 'utf-8');
    const newSetting = enable ? 'DumpFrames = True' : 'DumpFrames = False';
    const newConfig = config.replace(settingsRegExp, newSetting, 'utf-8');
    fs.writeFileSync(fullPlaybackPath, newConfig);
}


function getPlaybackFolder() {
    const regExp = /(.*\\)/;
    const playbackPath = settingsStmt.get('dolphinPath').value;
    return regExp.exec(playbackPath)[0];
}