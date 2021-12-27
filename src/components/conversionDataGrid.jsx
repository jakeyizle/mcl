import * as React from 'react';

import { playConversions } from './commonFunctions.js'
import { Characters, Stages, CharacterStrings, StageStrings, moves } from '../static/meleeIds.js';
import { DataGrid } from '@mui/x-data-grid';
import { Autocomplete, Button, MenuItem, TextField, Select, FormControl, InputLabel, FormLabel, ButtonGroup } from '@mui/material';

const db = require('better-sqlite3')('melee.db');


class ConversionDataGrid extends React.Component {
    constructor(props) {
        super(props);
        const playlists = db.prepare('SELECT * FROM playlists').all();
        const playlistAutocompleteOptions = playlists.map(x => ({ label: x.name }));
        const columns = [
            {
                field: 'playList', headerName: 'Playlists', flex: 2, sortable: false,
                renderCell: (params) => {
                    //update is slow if i use value
                    return (
                        <FormControl sx={{ m: 1, width: 1000 }}>
                            <Autocomplete
                                options={playlistAutocompleteOptions}
                                getOptionLabel={(option) => option.label}
                                isOptionEqualToValue={(option, value) => option.label === value.label}
                                multiple
                                limitTags={1}
                                onChange={(e, v, r, d) => this.handleChange(e, v, r, d, params.row.id)}
                                // value={this.getPlaylistsWithLabel(params.row.id)}
                                defaultValue={this.getPlaylistsWithLabel(params.row.id)}
                                renderInput={(renderParams) => <TextField {...renderParams} label="Playlists" />}
                                key={params.row.id}
                            />
                        </FormControl>
                    )
                }
            },
            {
                field: 'playReplay', sortable: false, type: 'actions', headerName: 'Play Replay', flex: 1,
                renderCell: (params) => <Button onClick={(e) => playConversions([params.row], false)}>Play Replay</Button>
            },
            { field: 'startAt', type: 'date', headerName: 'Match time', flex: 1.5 },
            { field: 'attackingPlayer', headerName: 'Attacking Player', flex: 1 },
            { field: 'attackingCharacter', headerName: 'Attacking Character', flex: 1, valueFormatter: (params) => getKeyByValue(Characters, params.value) },
            { field: 'defendingPlayer', headerName: 'Defending Player', flex: 1 },
            { field: 'defendingCharacter', headerName: 'Defending Character', flex: 1, valueFormatter: (params) => getKeyByValue(Characters, params.value) },
            { field: 'stage', headerName: 'Stage', flex: 1, valueFormatter: (params) => getKeyByValue(Stages, params.value) },
            { field: 'percent', type: 'number', headerName: 'Damage done', flex: 1 },
            { field: 'time', type: 'number', headerName: 'Time', flex: 0.85 },
            { field: 'didKill', type: 'boolean', headerName: 'Killed?', flex: .8 },
            { field: 'moveCount', type: 'number', headerName: 'Moves', flex: 0.65 }
        ]
        if (this.props.isPlaylistGrid) {
            columns.unshift({
                field: 'Order', flex: 0.65, renderCell: (params) => {
                    let playlistPositions = this.props.data.map(x=>parseInt(x.playlistPosition));
                    let max = Math.max(...playlistPositions)
                    let isFirst = params.row.playlistPosition == 1;
                    let isLast = params.row.playlistPosition == max
                    return (
                        <ButtonGroup orientation="vertical">
                            <Button onClick={(e) => this.props.handleOrderChange(params, -1)} disabled={isFirst}>&#8593;</Button>
                            <Button onClick={(e) => this.props.handleOrderChange(params, 1)} disabled={isLast}>&#8595;</Button>
                        </ButtonGroup>
                    )
                }
            }, {
                field:'playlistPosition'            
            })
            columns.forEach(x => x.sortable = false);
        }
        this.state = {
            columns: columns
        }
        this.handleChange = this.handleChange.bind(this);
    }

    getPlaylistsWithLabel(conversionId) {
        return db.prepare('SELECT * FROM playlistConversion WHERE conversionId = ?').all(conversionId).map(y => ({ label: y.playlistName }));
    }
    handleChange(event, value, reason, details, conversionId) {
        if (reason === 'removeOption') {
            let playlist = details.option.label;
            let deleteStmt = db.prepare('DELETE FROM playlistConversion WHERE playlistName = ? AND conversionId = ?').run(playlist, conversionId);
        } else if (reason === 'selectOption') {
            let playlist = details.option.label;
            let dbPlaylistPosition = db.prepare('SELECT playlistPosition FROM playlistConversion WHERE playlistName = ? ORDER BY 1 DESC').get(playlist);
            let playlistPosition = dbPlaylistPosition?.playlistPosition + 1 || 1;
            let insertStmt = db.prepare('INSERT INTO playlistConversion (playlistName, conversionId, playlistPosition) VALUES (?, ?, ?)').run(playlist, conversionId, playlistPosition)
        } else if (reason === 'clear') {
            let deleteStmt = db.prepare('DELETE FROM playlistConversion WHERE conversionId = ?').run(conversionId);
        }
    }

    render() {
        return (
            <span>
                {this.props.isPlaylistGrid
                    ? <DataGrid rowHeight={100} 
                        rows={this.props.data}
                        columns={this.state.columns} disableColumnMenu />
                    : <DataGrid rowHeight={100}
                        disableSelectionOnClick
                        rows={this.props.data}
                        columns={this.state.columns}
                        pagination
                        rowsPerPageOptions={[10, 20, 50, 100]}
                        onPageSizeChange={(newPageSize) => this.props.handlePageSize(newPageSize)}
                        pageSize={this.props.pageSize}
                        rowCount={this.props.maxCount}
                        paginationMode="server"
                        onPageChange={(pageNumber) => this.props.handlePageChange(pageNumber)}
                        sortingMode="server"
                        onSortModelChange={(e) => this.props.handleSortModelChange(e)}
                        sortingOrder={['desc', 'asc']}
                        disableColumnMenu
                    />}
            </span>)


    }
}


function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

