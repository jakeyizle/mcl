const {
    default: SlippiGame
} = require('@slippi/slippi-js');
const db = require('better-sqlite3')('melee.db');
const {
    v4: uuidv4
} = require('uuid');
const {ipcRenderer} = require('electron')

ipcRenderer.invoke('loaded').then((result) => {
    (async () => {
        let {
            start,
            range,
            files
        } = result;
        let end = start + range;
    
        const insertGame = db.prepare("INSERT OR IGNORE INTO GAMES (name, path) VALUES (@name, @path)");
        const insertConversion = db.prepare("INSERT INTO conversions (zeroToDeath, startAt, moveCount, id, filepath, playerIndex,opponentIndex,startFrame,endFrame,startPercent,currentPercent,endPercent,didKill,openingType,attackingPlayer,defendingPlayer,attackingCharacter,defendingCharacter,stage,percent,time) VALUES (@zeroToDeath, @startAt, @moveCount, @id, @filePath, @playerIndex,@opponentIndex,@startFrame,@endFrame,@startPercent,@currentPercent,@endPercent,@didKill,@openingType,@attackingPlayer,@defendingPlayer,@attackingCharacter,@defendingCharacter,@stage,@percent,@time)")
        const insertMove = db.prepare("INSERT OR IGNORE INTO MOVES (inverseMoveIndex, conversionId,moveId,frame,hitCount,damage, moveIndex) VALUES (@inverseMoveIndex, @conversionId,@moveId,@frame,@hitCount,@damage, @moveIndex)");
    
        for (let i = start; i < end; i++) {
            console.log(i);
            try {
                const game = new SlippiGame(files[i].path);
                currentFile = files[i].path;
                const settings = game.getSettings();
                const metadata = game.getMetadata();
    
                let conversions = game.getStats().conversions;
                let moves = [];
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
                    conversions[j].id = uuidv4();
                    conversions[j].moveCount = conversions[j].moves.length;
                    for (let k = 0; k < conversions[j].moves.length; k++) {
                        conversions[j].moves[k].conversionId = conversions[j].id;
                        conversions[j].moves[k].moveIndex = k;
                        //this makes searching at the end of combos possible
                        conversions[j].moves[k].inverseMoveIndex = conversions[j].moves.length - (k + 1)
                    }
                    //otherwise all conversions in a game have same startAt date                      
                    conversions[j].startAt = metadata.startAt + `${conversions[j].startFrame}F`;
                    conversions[j].zeroToDeath = conversions[j].startPercent === 0 && conversions[j].didKill == 1 ? 1 : 0;
                    //copy by value
                    moves = moves.concat(conversions[j].moves);
                }
                insertGame.run(files[i]);
    
                const insertManyConversions = db.transaction((data) => {
                    for (const obj of data) insertConversion.run(obj);
                });
                insertManyConversions(conversions);
    
                //moves has to go after conversions cause foreign key is defined
                const insertManyMoves = db.transaction((data) => {
                    for (const obj of data) insertMove.run(obj);
                });
                insertManyMoves(moves);
                conversionsLoaded = conversions.length;
                ipcRenderer.invoke('gameLoad', conversionsLoaded);
            } catch (e) {   
                console.log(currentFile);
                console.log(e);
            }
        }
    })().finally(() => {
        ipcRenderer.send('finish');
    });
   
})

function invertPlayerIndex(index) {
    return index == 0 ? 1 : 0;
}



