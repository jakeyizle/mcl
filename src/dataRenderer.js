const {
    ipcRenderer
} = require('electron');
const db = require('./database');
const {
    default: SlippiGame
} = require('@slippi/slippi-js');
const fs = require('fs');
const sqliteDB = require('better-sqlite3')('melee.db');


ipcRenderer.on('execute', async (event, message) => {
    (async () => {
        console.log('execute!');
        let {
            start,
            range,
            files
        } = message;
        let end = start + range;
        let insertFiles = [];

        const insertGame = sqliteDB.prepare("INSERT OR IGNORE INTO GAMES (name, path) VALUES (@name, @path)");
        const insertConversion = sqliteDB.prepare("INSERT INTO conversions (filepath, playerIndex,opponentIndex,startFrame,endFrame,startPercent,currentPercent,endPercent,didKill,openingType,attackingPlayer,defendingPlayer,attackingCharacter,defendingCharacter,stage,percent,time) VALUES (@filePath, @playerIndex,@opponentIndex,@startFrame,@endFrame,@startPercent,@currentPercent,@endPercent,@didKill,@openingType,@attackingPlayer,@defendingPlayer,@attackingCharacter,@defendingCharacter,@stage,@percent,@time)")

        for (let i = start; i < end; i++) {
            try {
                insertFiles.push(files[i]);

                const game = new SlippiGame(files[i].path);
                const settings = game.getSettings();
                const metadata = game.getMetadata();

                let conversions = game.getStats().conversions;

                for (let j = 0; j < conversions.length; j++) {
                    //-123 is start of game
                    let attackingIndex = conversions[j].playerIndex
                    let defendingIndex = invertPlayerIndex(conversions[j].playerIndex);
                    conversions[j].startFrame = conversions[j].startFrame || -123;
                    conversions[j].endFrame = conversions[j].endFrame || game.getLatestFrame().frame;
                    conversions[j].filePath = files[i].path;
                    conversions[j].attackingPlayer = metadata.players[attackingIndex].names.code;
                    conversions[j].defendingPlayer = metadata.players[defendingIndex].names.code;
                    conversions[j].attackingCharacter = settings.players[attackingIndex].characterId;
                    conversions[j].defendingCharacter = settings.players[defendingIndex].characterId;
                    conversions[j].stage = settings.stageId;
                    conversions[j].percent = Math.round((conversions[j].currentPercent - conversions[j].startPercent) * 100) / 100;
                    conversions[j].time = Math.round((conversions[j].endFrame - conversions[j].startFrame) * 100) / 100;
                    conversions[j].opponentIndex = defendingIndex;
                    conversions[j].didKill = conversions[j].didKill ? 1 : 0;

                }
                insertGame.run(files[i]);
                
                const insertMany = sqliteDB.transaction((data) => {
                    for (const obj of data) insertConversion.run(obj);
                });
                insertMany(conversions);


                console.log('conversions loaded');
                console.log(`${i} of ${end} - start = ${start}`)
                ipcRenderer.invoke('reply', {
                    'name': 'gameLoaded',
                    'args': {
                        'current': i,
                        'max': end
                    }
                });
            } catch (e) {
                console.log(e);
                console.log('error :(')
            }
        }


    })();
})


function invertPlayerIndex(index) {
    return index == 0 ? 1 : 0;
}