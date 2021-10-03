const { ipcRenderer } = require('electron');
const db = require('./database');
const { default: SlippiGame } = require('@slippi/slippi-js');
const fs = require ('fs');

document.addEventListener("DOMContentLoaded", async function(){
//i tried creating the window and sending a message right after, but seemed like sometimes the message would get lost
//ipcRenderer.invoke('ready');

});


ipcRenderer.on('execute', async(event, message) => {
    console.log('execute!');
    let {name, args} = message;    
    if (this[name]) {
        this[name](args);
    } else {
        console.log("no function found");
    }
})

async function startDatabaseLoading() {    
    const dbData = await db.getRows('configuration', {'configId': 'replayPath'});
    const replayPath = dbData[0].value; 
    const replayFiles = await getReplayFiles(replayPath);

    const cachedReplays = await db.getAll('games');
    const cachedGames = cachedReplays.map(x=>x.name);

    const newReplays = replayFiles.filter(replayFile => !cachedGames.includes(replayFile.name));        

    ipcRenderer.invoke('reply', {
        'name': 'startingDatabaseLoad',
        'args': {
            'fileCount': newReplays.length,            
        }
    });
    for (let i = 0; i < newReplays.length; i++) {
        const game = new SlippiGame(newReplays[i].path);
        const settings = game.getSettings();
        const metadata = game.getMetadata();

        let conversions = game.getStats().conversions;
        ipcRenderer.invoke('reply', {
            'name': 'startingConversionLoad',
            'args': {
                'conversionCount': conversions.length,            
            }
        });

        for (let j = 0; j < conversions.length; j++) {
            //-123 is start of game
            conversions[j].startFrame = conversions[j].startFrame || -123;            
            conversions[j].endFrame = conversions[j].endFrame || game.getLatestFrame().frame;            
            conversions[j].filePath = newReplays[i].path;
            conversions[j].attackingPlayer = metadata.players[conversions[j].playerIndex].names.code;
            conversions[j].defendingPlayer = metadata.players[conversions[j].opponentIndex].names.code;
            conversions[j].attackingCharacter = settings.players[conversions[j].playerIndex].characterId;
            conversions[j].defendingCharacter = settings.players[conversions[j].opponentIndex].characterId;
            conversions[j].stage = settings.stageId;
            conversions[j].percent = Math.round((conversions[j].currentPercent - conversions[j].startPercent) * 100)/100;
            conversions[j].time = Math.round((conversions[j].endFrame - conversions[j].startFrame) * 100)/100;
            db.insertTableContent('conversions', conversions[j]);
            ipcRenderer.invoke('reply', {
                'name': 'conversionLoaded',
                'args': {
                    'conversionNumber': j            
                }
            });
        }        
        db.insertTableContent('games', newReplays[i]);        
        ipcRenderer.invoke('reply', {
            'name': 'fileLoaded',
            'args': {
                'fileNumber': i+1,            
            }
        });
        //does this help with a memory leak?
        //i was having an issue where windows would crash after processing about 90 files
        //then i added a sleep to help debug, and the issue went away    
        await sleep(1);
    }
}


async function getReplayFiles(path) {
    let files = await getFiles(path);
    //ends in .slp
    let regExp = /.*\.slp$/;
    let replays = files.filter(file => regExp.test(file.name));
    return replays;
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


  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }