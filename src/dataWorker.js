const {
    isMainThread,
    parentPort,
    workerData
} = require('worker_threads');
const {
    default: SlippiGame
} = require('@slippi/slippi-js');
const fs = require('fs');
const db = require('better-sqlite3')('melee.db');
const {
    v4: uuidv4
} = require('uuid');
var currentFile;

//should never be in mainthread
if (isMainThread) {
    console.log('main!');
} else {
    (async () => {
        let {
            start,
            range,
            files
        } = workerData;
        let end = start + range;

        const insertGame = db.prepare("INSERT OR IGNORE INTO GAMES (name, path) VALUES (@name, @path)");
        const insertConversion = db.prepare("INSERT INTO conversions (id, filepath, playerIndex,opponentIndex,startFrame,endFrame,startPercent,currentPercent,endPercent,didKill,openingType,attackingPlayer,defendingPlayer,attackingCharacter,defendingCharacter,stage,percent,time) VALUES (@id, @filePath, @playerIndex,@opponentIndex,@startFrame,@endFrame,@startPercent,@currentPercent,@endPercent,@didKill,@openingType,@attackingPlayer,@defendingPlayer,@attackingCharacter,@defendingCharacter,@stage,@percent,@time)")
        const insertMove = db.prepare("INSERT OR IGNORE INTO MOVES (conversionId,moveId,frame,hitCount,damage) VALUES (@conversionId,@moveId,@frame,@hitCount,@damage)");

        for (let i = start; i < end; i++) {
            try {
                const game = new SlippiGame(files[i].path);
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
                    conversions[j].moves.forEach(move => {
                        move.conversionId = conversions[j].id;
                    })
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

                parentPort.postMessage(`${i} of ${end} - start = ${start}`);
            } catch (e) {
                // console.log(e);
                // console.log('error :(')
                console.log(currentFile);
                // insertGame.run(currentFile);

            }
        }
    })();


    function invertPlayerIndex(index) {
        return index == 0 ? 1 : 0;
    }



}