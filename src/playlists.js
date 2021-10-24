var playlistConversions;

function loadPlaylist() {
    let playlistName = document.getElementById('playlistDropdown').value;
    document.getElementById('playlistName').value = playlistName
    // let playlist = db.prepare('SELECT * FROM playlists WHERE name = ?').all(currentPlaylist)
    playlistConversions = db.prepare('select  * FROM conversions WHERE id IN (SELECT conversionid FROM playlistConversion WHERE playlistName = ?)').all(playlistName);
    loadPlaylistTable(playlistConversions);
    document.getElementById('playPlaylistReplays').style.display = playlistConversions.length > 0 ? 'block' : 'none';
    document.getElementById('recordPlaylistReplays').style.display = playlistConversions.length > 0 ? 'block' : 'none';
}

function createOrUpdatePlaylist() {
    let playlistName = document.getElementById('playlistName').value;
    let playlistDropdown = document.getElementById('playlistDropdown');

    try {
        let insertStmt = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(playlistName);
        let option = createDropdownOption(playlistName, playlistName);
        playlistDropdown.appendChild(option);
        playlistDropdown.value = playlistName;
    } catch (e) {
        console.log(e);
    }
}

//need to refactor to common method
function loadPlaylistTable(playlistConversions) {
    //table and row creation
    let tableBody = document.getElementById('playlistTableBody');
    tableBody.innerHTML = '';
    //columns - match to conversion properties or custom logic
    let fields = ['playReplay', 'attackingPlayer', 'attackingCharacter', 'defendingPlayer', 'defendingCharacter', 'stage', 'percent', 'time', 'didKill', 'moveCount']
    let header = document.getElementById('playlistTableHeader');
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

    for (let conversion of playlistConversions) {
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
                    playConversions([conversion])
                });
                cell.appendChild(button);
            } else {
                cell.innerHTML = conversion[field];
            }
            row.appendChild(cell);
        }
        tableBody.appendChild(row);
    }
}

function deletePlaylist() {
    let playlistName = document.getElementById('playlistDropdown').value;
    let mapTableDelete = db.prepare('DELETE FROM playlistConversion where playlistName = ?').run(playlistName);
    let playlistTableDelete = db.prepare('DELETE FROM playlists where name = ?').run(playlistName);
    refreshDropdowns();
    loadPlaylist();
}