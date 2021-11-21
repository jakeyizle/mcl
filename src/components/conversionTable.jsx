import * as React from 'react';

import {playConversions} from './commonFunctions.js'
import { Characters, Stages, CharacterStrings, StageStrings, moves } from '../static/meleeIds.js';
import Multiselect from 'multiselect-react-dropdown';

const db = require('better-sqlite3')('melee.db');


class ConversionTable extends React.Component {
    constructor(props) {
        super(props);
        this.onHeaderClick = this.onHeaderClick.bind(this);
    }

    onHeaderClick(field, event) {
        event.preventDefault();
        this.props.onSortChange(field);
    }

    onSelect(selectedList, selectedItem, conversionId) {
        let insertStmt = db.prepare('INSERT INTO playlistConversion (playlistName, conversionId) VALUES (?, ?)').run(selectedItem.name, conversionId)
    }
    
    onRemove(selectedList, removedItem, conversionId) {
        let deleteStmt = db.prepare('DELETE FROM playlistConversion WHERE playlistName = ? AND conversionId = ?').run(removedItem.name, conversionId);
    }
    render() {
        let playlists = db.prepare('SELECT * FROM playlists').all().map(x=>({name: x.name, id: x.name}));


        let headerCells = this.props.fields.map(field => <th key={field} onClick={(e) => this.onHeaderClick(field, e)}>{field}</th>)
        let bodyRows = [];
        for (let conversion of this.props.conversions) {
            let rowCells = [];
            for (const field of this.props.fields) {
                if (field === 'attackingCharacter' || field === 'defendingCharacter' || field === 'stage') {
                    let value = field === 'stage' ? getKeyByValue(Stages, conversion[field]) : getKeyByValue(Characters, conversion[field]);
                    rowCells.push(<td key={field}>{value}</td>);
                } else if (field === 'playReplay') {
                    rowCells.push(<td key={field}><button onClick={(e) => playConversions([conversion], false, e)}>Play Replay</button>
                        {conversion[field]}</td>);
                } else if (field === 'playList') {
                    let playlistConversions = db.prepare('SELECT * FROM playlistConversion WHERE conversionId = ?').all(conversion.id).map(x=> ({name: x.playlistName, id:x.playlistName}));
                    rowCells.push(<td key={field}><Multiselect 
                        options={playlists} // Options to display in the dropdown
                        selectedValues={playlistConversions} // Preselected value to persist in dropdown
                        onSelect={(selectedList, selectedItem) =>this.onSelect(selectedList, selectedItem, conversion.id)} // Function will trigger on select event
                        onRemove={(selectedList, removedItem) =>this.onRemove(selectedList, removedItem, conversion.id)} // Function will trigger on remove event
                        displayValue="name" // Property name to display in the dropdown options
                        placeholder="Add or remove playlists"
                        /></td>);
                } else {
                    rowCells.push(<td key={field}>{conversion[field]}</td>);
                }
            }
            bodyRows.push(<tr key={conversion.id}>{rowCells}</tr>);
        }

        return (
            <table>
                <thead>
                    <tr>
                        {headerCells}
                    </tr>
                </thead>
                <tbody>{bodyRows}</tbody>
            </table>
        )

    }
}


function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

