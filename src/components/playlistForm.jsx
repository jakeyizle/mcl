import { Button, Select, TextField, Autocomplete, FormControl, createFilterOptions } from '@mui/material';
import * as React from 'react';

const db = require('better-sqlite3')('melee.db');
import { playConversions } from './commonFunctions.js'
const filter = createFilterOptions();

class PlaylistForm extends React.Component {
    constructor(props) {
        super(props);
        let fields = ['playList', 'playReplay', 'startAt', 'attackingPlayer', 'attackingCharacter', 'defendingPlayer', 'defendingCharacter', 'stage', 'percent', 'time', 'didKill', 'moveCount']
        let playlists = db.prepare('SELECT * from playlists').all().map(x => ({ label: x.name, value: x.name }));
        this.state = {
            conversions: undefined,
            playlists: playlists,
            selectedPlaylist: '',
            fields: fields,
        }
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
            case 'delete':
                let playlist = this.state.selectedPlaylist;
                let mapTableDelete = db.prepare('DELETE FROM playlistConversion where playlistName = ?').run(playlist);
                let playlistTableDelete = db.prepare('DELETE FROM playlists where name = ?').run(playlist);
                let playlists = this.state.playlists.filter(x=> x.value != playlist);
                this.setState({ selectedPlaylist: '', conversions: '', playlists: playlists });
                break;
        }
    }

    handleAutocompleteInputChange(event, value, name) {
        if (value === null || '') {
            if (event.type === 'change') { return };
            this.setState({
                [name]: '',
                conversions: ''
            })
            return;
        }

        let playlistValue = value?.value || value;        
        if (!this.state.playlists.some(s => s.value === playlistValue)) {
            let insertStmt = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(playlistValue);
            let playlists = this.state.playlists.concat([{label: playlistValue, value: playlistValue}])
            this.setState({
                [name]: playlistValue || '',
                playlists: playlists,
                conversions: ''
            })
        } else {
            let conversions = db.prepare('SELECT * FROM conversions c INNER JOIN playlistConversion p ON c.id = p.conversionId WHERE p.playlistName = ?').all(playlistValue);            
            console.log(conversions);
            this.setState({
                [name]: playlistValue || '',
                conversions: conversions
            })
        }        

    }

    handleOrderChange(params, orderChange) {
        let playlistName = params.row.playlistName;
        let conversionId = params.row.id;
        let oldPosition = params.row.playlistPosition;
        let newPosition = params.row.playlistPosition + orderChange

        let otherConversionUpdate = db.prepare('UPDATE playlistconversion SET playlistPosition = ? WHERE playlistName = ? AND playlistPosition = ?').run(oldPosition, playlistName, newPosition);
        let thisConversionUpdate = db.prepare('UPDATE playlistconversion SET playlistPosition = ? WHERE playlistName = ? AND conversionId = ?').run(newPosition, playlistName, conversionId)
        let conversions = db.prepare('SELECT * FROM conversions c INNER JOIN playlistConversion p ON c.id = p.conversionId WHERE p.playlistName = ?').all(this.state.selectedPlaylist);
        this.setState({
            conversions: conversions
        })            

        //should be using state...
        this.forceUpdate();
    }

    render() {        

        return (
            <div>
                <div>
                    <FormControl sx={{ m: 1, width: 200 }}>
                        <Autocomplete
                            name="selectedPlaylist"
                            value={this.state.selectedPlaylist}
                            options={this.state.playlists}
                            renderInput={(params) => (<TextField {...params} label="Playlist" variant="standard" />)}
                            onChange={(event, value) => {
                                this.handleAutocompleteInputChange(event, value, 'selectedPlaylist')
                            }
                            }
                            filterOptions={(options, params) => {
                                const filtered = filter(options, params);
                                const { inputValue } = params;
                                // Suggest the creation of a new value
                                const isExisting = options.some((option) => inputValue === option.label);
                                if (inputValue !== '' && !isExisting) {
                                    filtered.push({
                                        value: inputValue,
                                        label: `Add "${inputValue}"`
                                    })
                                }
                                return filtered;
                            }}
                            getOptionLabel={(option) => {   
                                return option.label || option;                             
                            }}
                            freeSolo
                        />
                    </FormControl>
                </div>
                {this.state.selectedPlaylist.length > 0
                    &&
                    <Button id="deletePlaylistButton" onClick={(e) => this.alterPlaylist('delete', e)}>Delete Playlist</Button>
                }
                {this.state.conversions && this.state.conversions.length > 0
                    ? <div>
                        <div style={{ height: 600, width: '100%' }}>
                            <div style={{ display: 'flex', height: '100%' }}>
                                <div style={{ flexGrow: 1 }}>
                                    <ConversionDataGrid data={this.state.conversions.sort((a, b) => a.playlistPosition - b.playlistPosition)} isPlaylistGrid={true} onOrderChange={this.handleOrderChange} />
                                </div>
                            </div>
                        </div>
                        <Button id="playPlaylistReplays" onClick={(e) => playConversions(this.state.conversions)}>Play all Replays</Button>
                        <Button id="recordPlaylistReplays" onClick={(e) => playConversions(this.state.conversions, true)}>Record all Replays</Button>
                    </div>
                    : this.state.selectedPlaylist === '' 
                    ? <div>Select/Create a playlist </div>
                    : <div>No conversions loaded...</div>
                }
            </div>

        )
    }
}