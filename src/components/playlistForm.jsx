import { Button, Select, TextField, Autocomplete, FormControl } from '@mui/material';
import * as React from 'react';

const db = require('better-sqlite3')('melee.db');
import { playConversions } from './commonFunctions.js'


class PlaylistForm extends React.Component {
    constructor(props) {
        super(props);
        let fields = ['playList', 'playReplay', 'startAt', 'attackingPlayer', 'attackingCharacter', 'defendingPlayer', 'defendingCharacter', 'stage', 'percent', 'time', 'didKill', 'moveCount']
        this.state = { conversions: undefined, playlistDropdown: '', fields: fields, playlistText: '' }

        this.alterPlaylist = this.alterPlaylist.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleAutocompleteInputChange = this.handleAutocompleteInputChange.bind(this);
        this.handleOrderChange = this.handleOrderChange.bind(this);
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
                    if (this.state.playlistText.length > 0) {
                        let playlist = this.state.playlistText;
                        let insertStmt = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(playlist);
                        this.setState({ playlistDropdown: playlist })
                    }
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

    handleAutocompleteInputChange(event, value, name) {
        let stateValue = value ? value.value : null
        this.setState({
            [name]: stateValue
        })
    }

    handleOrderChange(params, orderChange) {
        let playlistName = params.row.playlistName;
        let conversionId = params.row.id;
        let oldPosition = params.row.playlistPosition;
        let newPosition = params.row.playlistPosition + orderChange

        let otherConversionUpdate = db.prepare('UPDATE playlistconversion SET playlistPosition = ? WHERE playlistName = ? AND playlistPosition = ?').run(oldPosition, playlistName, newPosition);
        let thisConversionUpdate = db.prepare('UPDATE playlistconversion SET playlistPosition = ? WHERE playlistName = ? AND conversionId = ?').run(newPosition, playlistName, conversionId)
        //should be using state...
        this.forceUpdate();
    }

    render() {
        let playlists = db.prepare('SELECT * from playlists').all().map(x => ({ value: x.name, label: x.name }));
        let playlistConversions = db.prepare('SELECT * FROM conversions c INNER JOIN playlistConversion p ON c.id = p.conversionId WHERE p.playlistName = ?').all(this.state.playlistDropdown);
        //this is how we deal with "undefined" orders
        playlistConversions = playlistConversions?.sort((a, b) => a.playlistPosition - b.playlistPosition);        

        return (
            <div>
                Playlist Name:
                <TextField type="text" placeholder="Enter new playlist name " name="playlistText" value={this.state.playlistText} onChange={this.handleInputChange} />
                <div>
                    <FormControl sx={{ m: 1, width: 200 }}>
                        <Autocomplete
                            name="playlistDropdown"
                            options={playlists}
                            renderInput={(params) => (<TextField {...params} label="Playlist" variant="standard" />)}
                            onChange={(event, value) => this.handleAutocompleteInputChange(event, value, 'playlistDropdown')}
                            isOptionEqualToValue={(option, value) => option.value === value.value}
                        />
                    </FormControl>
                </div>
                <Button variant="contained" id="playlistButton" onClick={(e) => this.alterPlaylist('create', e)}>Save Playlist</Button>
                {this.state.playlistDropdown.length > 0
                    &&
                        <Button id="deletePlaylistButton" onClick={(e) => this.alterPlaylist('delete', e)}>Delete Playlist</Button>
                }
                {playlistConversions.length > 0
                    ? <div>
                        <div style={{ height: '1000px', width: '100%' }}>
                            <ConversionDataGrid data={playlistConversions.sort((a, b) => a.playlistPosition - b.playlistPosition)} isPlaylistGrid={true} handleOrderChange={this.handleOrderChange} />
                        </div>
                        <Button id="playPlaylistReplays" onClick={(e) => playConversions(playlistConversions)}>Play all Replays</Button>
                        <Button id="recordPlaylistReplays" onClick={(e) => playConversions(playlistConversions, true)}>Record all Replays</Button>
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