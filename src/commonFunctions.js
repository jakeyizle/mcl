const path = require('path');
const fs = require('fs');
const {
    exec,
    spawn
} = require('child_process');
// const crypto = require('crypto');
const OBSWebsocket = require('obs-websocket-js');

exports.playConversions = function playConversions(conversions, recordGame) {
    const settingsStmt = db.prepare('SELECT value from settings where key = ?');
    const playbackPath = settingsStmt.get('playbackPath').value;
    const isoPath = settingsStmt.get('isoPath').value;
    const preRoll = settingsStmt.get('preRoll').value || 0;
    const postRoll = settingsStmt.get('postRoll').value || 0;
    var output = {
        "mode": "queue",
        "replay": "",
        "isRealTimeMode": false,
        "outputOverlayFiles": true,
        "queue": []
    };
    for (let conversion of conversions) {
        let startFrame = conversion.startFrame - preRoll;
        let endFrame = conversion.endFrame + parseInt(postRoll);
        console.log(startFrame, endFrame);
        var queueMessage = {
            "path": conversion.filepath,
            "startFrame": startFrame,
            "endFrame": endFrame
        };
        output.queue.push(queueMessage);
    }
    let jsonPath = path.join(__dirname, "tempMoments.json");
    //if i use the json directly it doesnt work, so have to write it to a file first
    fs.writeFileSync(jsonPath, JSON.stringify(output));
    //pretty sure only the -i and -e are needed?
    var replayCommand = `"${playbackPath}" -i "${jsonPath}" -b -e "${isoPath}" --cout`;
    console.log(replayCommand);
    var dolphinProcess = exec(replayCommand)
    if (recordGame) {
        recordReplay(dolphinProcess);
    } else {
        dolphinProcess.stdout.on('data', (line) => { 
            if (line.includes('[NO_GAME]')) {
                spawn("taskkill", ["/pid", dolphinProcess.pid, '/f', '/t']);
            }
        })
    }                
}

async function recordReplay(dolphinProcess) {
    const settingsStmt = db.prepare('SELECT value from settings where key = ?');
    const obsPassword = settingsStmt.get('obsPassword').value;
    const obsPort = settingsStmt.get('obsPort').value;
    const obs = new OBSWebsocket();
    obs.connect({address: `localhost:${obsPort}`, password:obsPassword});
    let startFrame;
    let endFrame;
    let currentFrame;
    let recordingStarted;
    let fileName;

    dolphinProcess.stdout.on('data', (line) => {        
        const commands = _.split(line, "\r\n");
        _.each(commands, async(command) => {
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
                spawn("taskkill", ["/pid", dolphinProcess.pid, '/f', '/t']);
                recordingStarted = false;
            }
        });
    })
}


