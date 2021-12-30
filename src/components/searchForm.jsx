import * as React from 'react';
import { Characters, Stages, CharacterStrings, StageStrings, moves } from '../static/meleeIds.js';
// import Button from '@mui/material/Button';
import { TextField, Button, Checkbox, Box, FormControlLabel, Select, FormControl, Autocomplete, MenuItem, Grid } from '@mui/material';
const db = require('better-sqlite3')('melee.db');

class SearchForm extends React.Component {
  constructor(props) {
    super(props)
    let fields = ['playList', 'playReplay', 'startAt', 'attackingPlayer', 'attackingCharacter', 'defendingPlayer', 'defendingCharacter', 'stage', 'percent', 'time', 'didKill', 'moveCount']
    this.state = {
      attackingPlayerCode: '',
      attackingCharacter: '',
      defendingPlayerCode: '',
      defendingCharacter: '',
      stage: '',
      didKill: false,
      excludeAssigned: false,
      minimumDamage: '',
      maximumDamage: '',
      minimumMove: '',
      maximumMove: '',
      conversions: [],
      pageNumber: 0,
      maxPageNumber: undefined,
      sortField: 'startAt',
      sortDir: 'desc',
      fields: fields,
      conversionCount: undefined,
      pageSize: 5,
    }
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleAutocompleteInputChange = this.handleAutocompleteInputChange.bind(this);
    this.getConversions = this.getConversions.bind(this);
    this.handlePageSize = this.handlePageSize.bind(this);
    this.handleSortModelChange = this.handleSortModelChange.bind(this);

    this.characters = [];
    for (const character in Characters) {
      this.characters.push({
        value: Characters[character],
        label: character
      })
    }

    this.stages = [];
    for (const stage in Stages) {
      this.stages.push({
        value: Stages[stage],
        label: stage
      })
    }


  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }

  handleAutocompleteInputChange(event, value, name) {
    let stateValue = value ? value.value : null
    this.setState({
      [name]: stateValue
    })
  }


  getConversions() {
    let offset = (this.state.pageNumber) * this.state.pageSize;

    //TODO build query better
    // let itemsPerPage = document.getElementById('itemsPerPage').value || 20;

    //dynamic search solution
    let queryObject = {};
    let whereString = 'WHERE 1=1';
    if (this.state.attackingPlayerCode != '') {
      whereString += ' AND attackingPlayer = @attackingPlayerCode'
      queryObject.attackingPlayerCode = this.state.attackingPlayerCode;
    };
    if (this.state.attackingCharacter != '' || this.state.attackingCharacter === 0) {
      whereString += ' AND attackingCharacter = @attackingCharacter'
      //parseint needed for sqlite comparison
      queryObject.attackingCharacter = parseInt(this.state.attackingCharacter);
    };
    if (this.state.defendingPlayerCode != '') {
      whereString += ' AND defendingPlayer = @defendingPlayerCode'
      queryObject.defendingPlayerCode = this.state.defendingPlayerCode;
    };
    if (this.state.defendingCharacter != '' || this.state.defendingCharacter === 0) {
      whereString += ' AND defendingCharacter = @defendingCharacter'
      queryObject.defendingCharacter = parseInt(this.state.defendingCharacter);
    };
    if (this.state.stage != '' && this.state.stage) {
      whereString += ' AND stage = @stage'
      queryObject.stage = parseInt(this.state.stage);
    };
    if (this.state.minimumDamage) {
      whereString += ' AND percent >= @minimumDamage'
      queryObject.minimumDamage = parseInt(this.state.minimumDamage);
    };
    if (this.state.maximumDamage) {
      whereString += ' AND percent <= @maximumDamage';
      queryObject.maximumDamage = parseInt(this.state.maximumDamage);
    }
    if (this.state.minimumMove) {
      whereString += ' AND moveCount >= @minimumMoveCount';
      queryObject.minimumMoveCount = parseInt(this.state.minimumMove);
    }
    if (this.state.maximumMove) {
      whereString += ' AND moveCount <= @maximumMoveCount';
      queryObject.maximumMoveCount = parseInt(this.state.maximumMove);
    }
    if (this.state.didKill) {
      whereString += ' AND didKill = 1'
      //special case cause sqlite doesnt store true/false?
    };
    if (this.state.excludeAssigned) {
      whereString += ' AND id NOT IN (SELECT conversionId from playlistconversion)'
    }
    //need to compare performance versues executing a count statement with cache logic
    let query = `WITH cte AS(SELECT count(*) total FROM conversions ${whereString}) SELECT *, (select total from cte) as total FROM conversions ${whereString}`;
    query += ` ORDER BY ${this.state.sortField} ${this.state.sortDir} LIMIT ${this.state.pageSize} OFFSET ${offset}`
    console.log(query);
    console.log(queryObject);
    let prepQuery = db.prepare(query);
    let searchConversions = queryObject ? prepQuery.all(queryObject) : prepQuery.all();
    console.log(searchConversions);
    let maxPageCount = searchConversions.length > 0 ? Math.ceil(searchConversions[0].total / this.state.pageSize) : 1;
    this.setState({ conversions: searchConversions, maxPageNumber: maxPageCount, conversionCount: searchConversions[0]?.total || 0 });
  }

  setPage(pageNumber, event) {
    if (event) {event.preventDefault()};
    this.setState({ pageNumber: pageNumber },
      () => this.getConversions())
  }

  handleSortModelChange(event) {
    console.log(event);
    this.setState({sortDir: event[0].sort, sortField: event[0].field}, 
      () => this.getConversions())
  }

  handlePageSize(newPageSize) {
    this.setState({pageSize: newPageSize}, 
      () => this.getConversions())
  }

  render() {

    return (
      <div>
        <Box onSubmit={(e) => this.setPage(0, e)}
          component="form"
          sx={{
            '& .MuiTextField-root': { m: 1, width: '25ch' }
          }}
          noValidate
          autoComplete="off"
        >
          <Grid container >
            <Grid item>
              <TextField label="Attacking Player Code" name="attackingPlayerCode" value={this.state.attackingPlayerCode} onChange={this.handleInputChange} type="text" placeholder="BLAH#123" />
            </Grid>
            <Grid item>
              <Autocomplete
                name="attackingCharacter"
                options={this.characters}
                renderInput={(params) => (<TextField {...params} label="Attacking Character" variant="standard" />)}
                onChange={(event, value) => this.handleAutocompleteInputChange(event, value, 'attackingCharacter')}
                isOptionEqualToValue={(option, value) => option.value === value.value}
              />
            </Grid>
          </Grid>
          <Grid container >
            <Grid item>
              <TextField label="Defending Player Code" name="defendingPlayerCode" value={this.state.defendingPlayerCode} type="text" placeholder="BLAH#123" onChange={this.handleInputChange} />
            </Grid>
            <Grid item>
              <Autocomplete
                name="defendingCharacter"
                options={this.characters}
                renderInput={(params) => (<TextField {...params} label="Defending Character" variant="standard" />)}
                onChange={(event, value) => this.handleAutocompleteInputChange(event, value, 'defendingCharacter')}
                isOptionEqualToValue={(option, value) => option.value === value.value}
              />
            </Grid>
          </Grid>
          <Autocomplete
            name="stage"
            options={this.stages}
            renderInput={(params) => (<TextField {...params} label="Stage" variant="standard" />)}
            onChange={(event, value) => this.handleAutocompleteInputChange(event, value, 'stage')}
            isOptionEqualToValue={(option, value) => option.value === value.value}
          />
          <div>
            <FormControlLabel control={<Checkbox />} label="Did Combo Kill?" onChange={this.handleInputChange} name="didKill" checked={this.state.didKill} />
          </div>
          <div>
            <TextField label="Minimum damage done" type="number" placeholder="Minimum %" onChange={this.handleInputChange} name="minimumDamage" value={this.state.minimumDamage} />
            <TextField label="Maximum damage done" type="number" placeholder="Max %" onChange={this.handleInputChange} name="maximumDamage" value={this.state.maximumDamage} />
          </div>
          <div>
            <TextField label="Minimum move count" type="number" placeholder="Minimum moves in combo" onChange={this.handleInputChange} name="minimumMove" value={this.state.minimumMove} />
            <TextField label="Maximum move count" type="number" placeholder="Max moves in combo" onChange={this.handleInputChange} name="maximumMove" value={this.state.maximumMove} />
          </div>
          <div>
            <FormControlLabel control={<Checkbox />} label="Exclude assigned conversions?" onChange={this.handleInputChange} name="excludeAssigned" checked={this.state.excludeAssigned} />
          </div>
          <Button type="submit" variant="contained">Search Conversions</Button>

          {this.state.conversions.length > 0 &&
            <div style={{ height: '1000px', width: '100%' }}>
              <ConversionDataGrid data={this.state.conversions} maxCount={this.state.conversionCount} handlePageChange={(pageNumber) => this.setPage(pageNumber)}
              handleSortModelChange={(e) => this.handleSortModelChange(e)} handlePageSize={(newPageSize) => this.handlePageSize(newPageSize)}  pageSize={this.state.pageSize} 
              sortModel={[{field: this.state.sortField, sort: this.state.sortDir}]}
              />
            </div>
          }
        </Box>
      </div>


    );
  }
}


