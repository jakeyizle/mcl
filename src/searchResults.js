const path = require('path');
const fs = require('fs');
const {
    exec,
    spawn
} = require('child_process');
// const crypto = require('crypto');
const OBSWebsocket = require('obs-websocket-js');

//this is probably indicative of bad design
var conversions;
var pageNumber;
var itemsPerPage = 20;
var maxPageCount;
var sortField = 'id';
var sortDir = 'ASC';
var previousCountQuery;

function searchConversions(newPageNumber = 1) {
    pageNumber = newPageNumber;
    let offset = (pageNumber - 1) * itemsPerPage;

    //TODO build query better
    let attackingPlayerCode = document.getElementById('attackingPlayerCode').value;
    let attackingCharacter = document.getElementById('attackingCharacter').value;
    let defendingPlayerCode = document.getElementById('defendingPlayerCode').value;
    let defendingCharacter = document.getElementById('defendingCharacter').value;
    let stage = document.getElementById('stage').value;
    let didKill = document.getElementById('didKill').checked;
    let minimumDamage = document.getElementById('minimumDamage').value;
    let maximumDamage = document.getElementById('maximumDamage').value;
    let minimumMoveCount = document.getElementById('minimumMoveCount').value;
    let maximumMoveCount = document.getElementById('maximumMoveCount').value;

    // let itemsPerPage = document.getElementById('itemsPerPage').value || 20;

    //dynamic search solution
    let queryObject = {};

    let baseQuery = 'SELECT * FROM conversions WHERE 1=1';
    if (attackingPlayerCode) {
        baseQuery += ' AND attackingPlayer = @attackingPlayerCode'
        queryObject.attackingPlayerCode = attackingPlayerCode;
    };
    if (attackingCharacter) {
        baseQuery += ' AND attackingCharacter = @attackingCharacter'
        //parseint needed for sqlite comparison
        queryObject.attackingCharacter = parseInt(attackingCharacter);
    };
    if (defendingPlayerCode) {
        baseQuery += ' AND defendingPlayer = @defendingPlayerCode'
        queryObject.defendingPlayerCode = defendingPlayerCode;
    };
    if (defendingCharacter) {
        baseQuery += ' AND defendingCharacter = @defendingCharacter'
        queryObject.defendingCharacter = parseInt(defendingCharacter);
    };
    if (stage) {
        baseQuery += ' AND stage = @stage'
        queryObject.stage = parseInt(stage);
    };
    if (didKill) {
        baseQuery += ' AND didKill = 1'
        //special case cause sqlite doesnt store true/false?
    };
    if (minimumDamage) {
        baseQuery += ' AND percent >= @minimumDamage'
        queryObject.minimumDamage = parseInt(minimumDamage);
    };
    if (maximumDamage) {
        baseQuery += ' AND percent <= @maximumDamage';
        queryObject.maximumDamage = parseInt(maximumDamage);
    }
    if (minimumMoveCount) {
        baseQuery += ' AND moveCount >= @minimumMoveCount';
        queryObject.minimumMoveCount = parseInt(minimumMoveCount);
    }
    if (maximumMoveCount) {
        baseQuery += ' AND moveCount <= @maximumMoveCount';
        queryObject.maximumMoveCount = parseInt(maximumMoveCount);
    }
    //Paging with SQL for performance
    //seems to get slow when offset is large and there are where conditions
    baseQuery += ` ORDER BY ${sortField} ${sortDir} LIMIT ${itemsPerPage} OFFSET ${offset}`
    let query = db.prepare(baseQuery);
    conversions = queryObject ? query.all(queryObject) : query.all();


    document.getElementById('pageNumbers').style.display = 'block';

    //page number logic
    //probably should just create 2 separate queries and add the WHERE clauses instead of this
    let regex = /ORDER.*/;
    let tempQuery = baseQuery.replace(regex, '');
    let countQuery = tempQuery.replace('SELECT *', 'SELECT COUNT(id)');
    //this is slow to run every time therefore caching solution
    if (!(previousCountQuery === countQuery)) {
        let count = queryObject ? db.prepare(countQuery).pluck().get(queryObject) : db.prepare(countQuery).pluck().get();
        maxPageCount = Math.ceil(count / itemsPerPage);
    }
    document.getElementById('pageNumber').innerHTML = `${pageNumber} of ${maxPageCount}`;
    if (pageNumber == 1) {
        document.getElementById('previousPage').disabled = 'true';
    } else {
        document.getElementById('previousPage').removeAttribute('disabled');
    }
    if (pageNumber === maxPageCount) {
        document.getElementById('nextPage').disabled = 'true';
    } else {
        document.getElementById('nextPage').removeAttribute('disabled');
    }
    clearAndCreateRows();
    previousCountQuery = countQuery;
}

function setConversionSort(newSortField) {
    if (sortField === newSortField) {
        sortDir = sortDir === 'ASC' ? 'DESC' : 'ASC';
    }
    sortField = newSortField;
    searchConversions(pageNumber);
}

function clearAndCreateRows() {
    //table and row creation
    let tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    //columns - match to conversion properties or custom logic
    let fields = ['playList', 'playReplay', 'attackingPlayer', 'attackingCharacter', 'defendingPlayer', 'defendingCharacter', 'stage', 'percent', 'time', 'didKill', 'moveCount']
    let header = document.getElementById('tableHeader');
    header.innerHTML = '';
    for (let field of fields) {
        //add header, and sort onclick
        let headerElement = document.createElement('th');
        headerElement.innerHTML = field;
        headerElement.addEventListener('click', () => {
            setConversionSort(field);
        });
        header.appendChild(headerElement);
    }

    //create rows with data
    let playlists = db.prepare('SELECT name FROM playlists').pluck().all();
    let i = 0;
    for (let conversion of conversions) {
        let row = document.createElement('tr');
        for (let field of fields) {
            //table body logic
            let cell = document.createElement('td');
            if (field === 'attackingCharacter' || field === 'defendingCharacter' || field === 'stage') {
                //translate from ID to name
                cell.innerHTML = field === 'stage' ? getKeyByValue(Stages, conversion[field]) : getKeyByValue(Characters, conversion[field]);
            } else if (field === 'playReplay') {
                let button = document.createElement("button");
                button.innerHTML = "Play Replay";
                button.addEventListener('click', () => {
                    playConversions([conversion]);
                });
                cell.appendChild(button);
            } else if (field === 'playList') {
                let conversionPlaylistDropdown = document.createElement('select');
                conversionPlaylistDropdown.setAttribute('id', `playlist-id-${i}`);
                conversionPlaylistDropdown.setAttribute('multiple', 'multiple');
                for (let playlist of playlists) {
                    let option = createDropdownOption(playlist, playlist);
                    let playlistConversion = db.prepare('SELECT * FROM playlistConversion WHERE playlistName = ? and conversionId = ?').all(playlist, conversion.id);
                    if (playlistConversion.length > 0) {
                        option.setAttribute('selected', true)
                    }
                    conversionPlaylistDropdown.appendChild(option);
                }
                cell.appendChild(conversionPlaylistDropdown);
            } else {
                cell.innerHTML = conversion[field];
            }
            row.appendChild(cell);
        }
        tableBody.appendChild(row);
        var select = new MSFmultiSelect(
            document.querySelector(`#playlist-id-${i}`), {
                selectAll: true,
                searchBox: true,
                onChange: function (checked, value, instance) {
                    let playlistConversionQuery = checked ? 'INSERT INTO playlistConversion (playlistName, conversionId) VALUES (?, ?)' :
                        'DELETE FROM playlistConversion WHERE playlistName = ? AND conversionId = ?';
                    let query = db.prepare(playlistConversionQuery).run(value, conversion.id);
                },
                placeholder: 'Assign playlists'
            }
        );
        i++;

    }
}

//TODO make one method
function playConversions(conversions, recordGame) {
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
    }
    
    
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

function recordReplay(dolphinProcess) {
    const obs = new OBSWebsocket();
    obs.connect({address: 'localhost:4444', password:'password'});
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