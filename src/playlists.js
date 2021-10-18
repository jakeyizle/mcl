var currentPlaylist;

function loadPlaylist() {
    currentPlaylist = document.getElementById('playlistDropdown').value;
    document.getElementById('playlistName').value = currentPlaylist;
    let playlist = db.prepare('SELECT * FROM playlists WHERE name = ?').all(currentPlaylist)
}

function createOrUpdatePlaylist() {
    let playlistName = document.getElementById('playlistName').value;
    console.log(playlistName);
    let playlistDropdown = document.getElementById('playlistDropdown');

    try {
            let insertStmt = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(playlistName);
            let option = createDropdownOption(playlistName, playlistName);
            playlistDropdown.appendChild(option);
            playlistDropdown.value = playlistName;
            currentPlaylist = playlistName;  
    } catch (e) {
        console.log(e);
    }
}


function loadPlaylistTable() {

}