import * as React from 'react';

const db = require('better-sqlite3')('melee.db');
import {playConversions} from './commonFunctions.js'


class PlaylistForm extends React.Component {
    constructor(props) {
        super(props);
        let fields = ['playList', 'playReplay', 'startAt', 'attackingPlayer', 'attackingCharacter', 'defendingPlayer', 'defendingCharacter', 'stage', 'percent', 'time', 'didKill', 'moveCount']
        this.state = { conversions: undefined, playlistDropdown: '', fields: fields, playlistText: '' }

        this.alterPlaylist = this.alterPlaylist.bind(this);
        this.loadPlaylistConversions = this.loadPlaylistConversions.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
    }

    handleInputChange(event) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        this.setState({
            [name]: value
        });
    }

    alterPlaylist(action, e) {
        switch (action) {
            case 'create':
                try {
                    let playlist = this.state.playlistText;
                    let insertStmt = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(playlist);
                    this.setState({ playlistDropdown: playlist })
                } catch (e) {
                    console.log(e);
                }
                break;
            case 'delete':
                let playlist = this.state.playlistDropdown;
                console.log(playlist);
                let mapTableDelete = db.prepare('DELETE FROM playlistConversion where playlistName = ?').run(playlist);
                console.log(mapTableDelete);
                let playlistTableDelete = db.prepare('DELETE FROM playlists where name = ?').run(playlist);
                console.log(playlistTableDelete);
                this.setState({ playlistDropdown: '' })
                break;
        }
    }

    loadPlaylistConversions(e) {
        console.log(e.target);
    }
    render() {
        let playlists = db.prepare('SELECT * from playlists').all().map(x => ({ name: x.name, key: x.name }));

        let playlistConversions = db.prepare('select  * FROM conversions WHERE id IN (SELECT conversionid FROM playlistConversion WHERE playlistName = ?)').all(this.state.playlistDropdown);


        return (
            <div>
                Playlist Name:
                <input type="text" placeholder="Enter new playlist name " name="playlistText" value={this.state.playlistText} onChange={this.handleInputChange} />
                <button id="playlistButton" onClick={(e) => this.alterPlaylist('create', e)}>Save Playlist</button>
               
                <select name="playlistDropdown" onChange={this.handleInputChange} value={this.state.playlistDropdown}>
                    {createDropdownOptions(playlists)}
                </select>
                {this.state.playlistDropdown.length > 0 &&
                    <button id="deletePlaylistButton" onClick={(e) => this.alterPlaylist('delete', e)}>Delete Playlist</button>}
                {playlistConversions.length > 0 
                ? <div><ConversionTable conversions={playlistConversions} fields={this.state.fields} />
                    <button id="playPlaylistReplays" onClick={(e) => playConversions(playlistConversions)}>Play all Replays</button>
                    <button id="recordPlaylistReplays" onClick={(e) => playConversions(playlistConversions, true)}>Record all Replays</button>
                    </div>
                   : <div>No conversions loaded...</div>
                }
            </div>

        )
    }
}

function createDropdownOptions(data) {
    let options = data.map(x => <option key={x.key} value={x.key} name={x.key}>{x.name}</option>);
    options.unshift(<option key="def" value="">Select a value...</option>)
    return options;
}