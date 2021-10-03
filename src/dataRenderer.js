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
        const insertConversion = sqliteDB.prepare("INSERT INTO conversions (hash, filepath, playerIndex,opponentIndex,startFrame,endFrame,startPercent,currentPercent,endPercent,didKill,openingType,attackingPlayer,defendingPlayer,attackingCharacter,defendingCharacter,stage,percent,time) VALUES (@hash, @filePath, @playerIndex,@opponentIndex,@startFrame,@endFrame,@startPercent,@currentPercent,@endPercent,@didKill,@openingType,@attackingPlayer,@defendingPlayer,@attackingCharacter,@defendingCharacter,@stage,@percent,@time)")
        const insertMove = sqliteDB.prepare("INSERT OR IGNORE INTO MOVES (conversionHash,moveId,frame,hitCount,damage) VALUES (@conversionHash,@moveId,@frame,@hitCount,@damage)");

        for (let i = start; i < end; i++) {
            try {
                insertFiles.push(files[i]);

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
                    conversions[j].hash = murmurhash3_32_gc(files[i].path + conversions[j].startFrame +conversions[j].attackingPlayer+conversions[j].defendingPlayer, 69);
                    conversions[j].moves.forEach(move => {
                        move.conversionHash = conversions[j].hash;                        
                    })
                    moves = moves.concat(conversions[j].moves);                   
                }
                insertGame.run(files[i]);

                const insertManyConversions = sqliteDB.transaction((data) => {
                    for (const obj of data) insertConversion.run(obj);
                });
                insertManyConversions(conversions);

                //moves has to go after conversions cause foreign key is defined
                const insertManyMoves = sqliteDB.transaction((data) => {
                    for (const obj of data) insertMove.run(obj);
                });
                insertManyMoves(moves);

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




/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 * 
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 * 
 * @param {string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash 
 */

 function murmurhash3_32_gc(key, seed) {
	var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;
	
	remainder = key.length & 3; // key.length % 4
	bytes = key.length - remainder;
	h1 = seed;
	c1 = 0xcc9e2d51;
	c2 = 0x1b873593;
	i = 0;
	
	while (i < bytes) {
	  	k1 = 
	  	  ((key.charCodeAt(i) & 0xff)) |
	  	  ((key.charCodeAt(++i) & 0xff) << 8) |
	  	  ((key.charCodeAt(++i) & 0xff) << 16) |
	  	  ((key.charCodeAt(++i) & 0xff) << 24);
		++i;
		
		k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

		h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
		h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
		h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
	}
	
	k1 = 0;
	
	switch (remainder) {
		case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
		case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
		case 1: k1 ^= (key.charCodeAt(i) & 0xff);
		
		k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
		h1 ^= k1;
	}
	
	h1 ^= key.length;

	h1 ^= h1 >>> 16;
	h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
	h1 ^= h1 >>> 13;
	h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
	h1 ^= h1 >>> 16;

	return h1 >>> 0;
}