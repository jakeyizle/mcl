import { Button, Box, TextField, Autocomplete, FormControl, createFilterOptions, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Alert } from '@mui/material';
import * as fs from 'fs'
import * as React from 'react';
import { playConversions, isOBSOn } from './commonFunctions.js'
const {dialog} = require('electron').remote;

const db = require('better-sqlite3')('melee.db');
const filter = createFilterOptions();
const settingsStmt = db.prepare('SELECT value from settings where key = ?');

class PlaylistForm extends React.Component {
    constructor(props) {
        super(props);
        let fields = ['playList', 'playReplay', 'startAt', 'attackingPlayer', 'attackingCharacter', 'defendingPlayer', 'defendingCharacter', 'stage', 'percent', 'time', 'didKill', 'moveCount']
        let playlists = db.prepare('SELECT * from playlists').all().map(x => ({ label: x.name, value: x.name }));
        this.recordingPath = React.createRef();
        this.state = {
            conversions: undefined,
            playlists: playlists,
            selectedPlaylist: '',
            fields: fields,
            dialogOpen: false,
            recordingName: '',
            recordingPath: settingsStmt.get('recordingPath')?.value || '',
            replayPathError: '',
            successRecording: ''
        }
        this.alterPlaylist = this.alterPlaylist.bind(this);
        this.handleAutocompleteInputChange = this.handleAutocompleteInputChange.bind(this);
        this.handleOrderChange = this.handleOrderChange.bind(this);
        this.getPlaylistTime = this.getPlaylistTime.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleConversionRemove = this.handleConversionRemove.bind(this);
        this.clickRefByName = this.clickRefByName.bind(this);
        this.recordReplay = this.recordReplay.bind(this);
    }

    clickRefByName(inputName) {
        this[inputName].current.click();
    }
    alterPlaylist(action, e) {
        switch (action) {
            case 'delete':
                let playlist = this.state.selectedPlaylist;
                let mapTableDelete = db.prepare('DELETE FROM playlistConversion where playlistName = ?').run(playlist);
                let playlistTableDelete = db.prepare('DELETE FROM playlists where name = ?').run(playlist);
                let playlists = this.state.playlists.filter(x => x.value != playlist);
                this.setState({ selectedPlaylist: '', conversions: '', playlists: playlists });
                break;
        }
    }

    handleAutocompleteInputChange(event, value, name) {
        if (value === null || '') {
            //otherwise this fires when backspacing through field
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
            let playlists = this.state.playlists.concat([{ label: playlistValue, value: playlistValue }])
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
                conversions: conversions.sort((a, b) => a.playlistPosition - b.playlistPosition)
            })
        }

    }

    handleConversionRemove() {
        let conversions = db.prepare('SELECT * FROM conversions c INNER JOIN playlistConversion p ON c.id = p.conversionId WHERE p.playlistName = ?').all(this.state.selectedPlaylist);
        this.setState({ conversions: conversions.sort((a, b) => a.playlistPosition - b.playlistPosition) })
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
            conversions: conversions.sort((a, b) => a.playlistPosition - b.playlistPosition)
        })
    }
    //todo clean up folder select
    handleInputChange(event, folder) {
        const target = event.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        if (name === 'recordingName') {
            //tests that filename is valid -- https://stackoverflow.com/a/53635003/18022439
            let windowsFileRegex = /([<>:"\/\\|?*])|(\.|\s)$/ig
            if (windowsFileRegex.test(value)) { return; }
        }
        if (target.type === 'file') {
            const path = target.files[0].path;
            //get the directory of a file
            const regExp = /(.*\\)/;
            value = regExp.exec(path)[0];
        } else if (target.type === 'button') {
            value = folder?.[0]+'\\';
        }
        this.setState({
            [name]: value
        });
    }

    handleDialogClose(successRecording = '') {
        this.setState({ dialogOpen: false, recordingName: '', successRecording: successRecording })
    }

    handleDialogOpen() {
        this.setState({ dialogOpen: true, replayPathError: '', recordingName: this.state.selectedPlaylist })
    }
    async recordReplay() {
        if (this.state.recordingPath == '') {
            this.setState({ replayPathError: 'Please select a folder' })
            return
        }
        let recordMethod = settingsStmt.get('recordMethod').value;
        //todo: OBS can be set to record different file types
        let fileExtension = recordMethod === 'OBS' ? '.mkv' : '.avi';
        let filePath = this.state.recordingPath + this.state.recordingName + fileExtension
        if (fs.existsSync(filePath)) {
            this.setState({ replayPathError: `${filePath} already exists` })
            return
        }
        let OBSCanConnect = await isOBSOn();
        if (recordMethod === 'OBS' && !OBSCanConnect) {
            this.setState({ replayPathError: 'OBS is either not open or configured incorrectly' })
            return
        }
        let sucessFileName = await playConversions(this.state.conversions, true, this.state.recordingPath, this.state.recordingName)
        this.handleDialogClose(sucessFileName)
    }

    getPlaylistTime() {
        function fmtMSS(s) { return (s - (s %= 60)) / 60 + (9 < s ? ':' : ':0') + s }

        let sum = 0;
        for (const conversion of this.state.conversions) {
            sum += conversion.time
        }
        let seconds = Math.round(sum / 60);
        return fmtMSS(seconds)
    }

    render() {
        return (
            <div>
                {this.state.successRecording && <Alert severity="success">Succesfully recorded {this.state.successRecording}</Alert>}
                <div>
                    <FormControl sx={{ m: 1, width: 200 }}>
                        <Autocomplete
                            name="selectedPlaylist"
                            value={this.state.selectedPlaylist}
                            options={this.state.playlists}
                            renderInput={(params) => (<TextField {...params} label="Playlist" variant="standard" />)}
                            onChange={(event, value) => {
                                this.handleAutocompleteInputChange(event, value, 'selectedPlaylist')
                            }}
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
                    <div>
                        <Button id="deletePlaylistButton" onClick={(e) => this.alterPlaylist('delete', e)}>Delete Playlist</Button>
                        <div>
                            {this.state.conversions.length} conversions - {this.getPlaylistTime()}
                        </div>
                    </div>
                }
                {this.state.conversions && this.state.conversions.length > 0
                    ? <div>
                        <div style={{ height: 600, width: '100%' }}>
                            <div style={{ display: 'flex', height: '100%' }}>
                                <div style={{ flexGrow: 1 }}>
                                    <ConversionDataGrid data={this.state.conversions} isPlaylistGrid={true} onOrderChange={this.handleOrderChange} onConversionRemove={this.handleConversionRemove} />
                                </div>
                            </div>
                        </div>
                        <Button id="playPlaylistReplays" onClick={(e) => playConversions(this.state.conversions)}>Play all Replays</Button>
                        <Button id="recordPlaylistReplays" onClick={(e) => this.handleDialogOpen()}>Record all Replays</Button>
                    </div>
                    : this.state.selectedPlaylist === ''
                        ? <div>Select/Create a playlist </div>
                        : <div>No conversions loaded...</div>
                }
                <div>
                    <Dialog open={this.state.dialogOpen} onClose={() => this.handleDialogClose()}>
                        <DialogTitle>Enter recording folder and name</DialogTitle>
                        {this.state.replayPathError && <Alert severity="error">{this.state.replayPathError}</Alert>}
                        <DialogContent>
                                <Button variant="outlined" name="recordingPath" onClick={(e) => this.handleInputChange(e, dialog.showOpenDialogSync({ properties: ['openDirectory'] }))}>Set Path Where Recordings Will Be Saved</Button>
                                <div>

                                {this.state.recordingPath && <span>{this.state.recordingPath}</span>}
                            </div>                                                        
                        
                        </DialogContent>
                        <DialogContent>

                        <TextField autoFocus fullWidth label="File name" name="recordingName" value={this.state.recordingName} onChange={(e) => this.handleInputChange(e)}></TextField>
                        </DialogContent>

                        <DialogActions>
                            <Button name="Cancel" onClick={() => this.handleDialogClose()}>Cancel</Button>
                            <Button name="Record" onClick={() => this.recordReplay()}>Record</Button>
                        </DialogActions>
                    </Dialog>
                </div>
            </div>
        )
    }
}