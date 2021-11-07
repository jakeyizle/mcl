import { Characters, Stages, CharacterStrings, StageStrings, moves } from '../static/meleeIds.js';

class SearchForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      attackingPlayerCode: "",
      attackingCharacter: "",
      defendingPlayerCode: "",
      defendingCharacter: "",
      stage: "",
      didKill: false,
      minimumDamage: undefined,
      maximumDamage: undefined,
      minimumMove: undefined,
      maximumMove: undefined,
      conversions: [],
      pageNumber: 1,
      maxPageNumber: undefined,
      sortField: 'startAt',
      sortDir: 'DESC',
    }
    this.handleInputChange = this.handleInputChange.bind(this);
    this.getConversions = this.getConversions.bind(this);
    this.sortConversions = this.sortConversions.bind(this);
  }

  handleInputChange(event) {

    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }

  getConversions() {

    let itemsPerPage = 20;
    let offset = (this.state.pageNumber - 1) * itemsPerPage;

    //TODO build query better
    // let itemsPerPage = document.getElementById('itemsPerPage').value || 20;

    //dynamic search solution
    let queryObject = {};
    let whereString = 'WHERE 1=1';
    if (this.state.attackingPlayerCode != "") {
      whereString += ' AND attackingPlayer = @attackingPlayerCode'
      queryObject.attackingPlayerCode = this.state.attackingPlayerCode;
    };
    if (this.state.attackingCharacter != "") {
      whereString += ' AND attackingCharacter = @attackingCharacter'
      //parseint needed for sqlite comparison
      queryObject.attackingCharacter = parseInt(this.state.attackingCharacter);
    };
    if (this.state.defendingPlayerCode != "") {
      whereString += ' AND defendingPlayer = @defendingPlayerCode'
      queryObject.defendingPlayerCode = this.state.defendingPlayerCode;
    };
    if (this.state.defendingCharacter != "") {
      whereString += ' AND defendingCharacter = @defendingCharacter'
      queryObject.defendingCharacter = parseInt(this.state.defendingCharacter);
    };
    if (this.state.stage != "") {
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

    let query = `with cte as(select count(*) total from conversions ${whereString}) SELECT *, (select total from cte) as total FROM conversions ${whereString}`;
    query += ` ORDER BY ${this.state.sortField} ${this.state.sortDir} LIMIT ${itemsPerPage} OFFSET ${offset}`

    let prepQuery = db.prepare(query);
    let searchConversions = queryObject ? prepQuery.all(queryObject) : prepQuery.all();
    let maxPageCount = searchConversions.length > 0 ? Math.ceil(searchConversions[0].total / itemsPerPage) : 1;
    this.setState({ conversions: searchConversions, maxPageNumber: maxPageCount });
  }

  setPage(pageNumber, event) {
    event.preventDefault();
    this.setState({ pageNumber: pageNumber }, 
      () => this.getConversions())
  }

  sortConversions(sortField) {
    let sortDir = 'DESC';
    if (sortField === this.state.sortField) {
      sortDir = this.state.sortDir === 'DESC' ? 'ASC' : 'DESC';
    }
    this.setState({
      sortField: sortField,
      sortDir: sortDir,
    }, () => this.getConversions())
  }

  render() {
    let previousButtonEnabled = this.state.pageNumber > 1;
    let nextButtonEnabled = this.state.pageNumber != this.state.maxPageNumber;

    let characters = [];
    for (const character in Characters) {
      characters.push({
        key: Characters[character],
        name: character
      })
    }

    let stages = [];
    for (const stage in Stages) {
      stages.push({
        key: Stages[stage],
        name: stage
      })
    }



    return (
      <div>
        <form onSubmit={(e) => this.setPage(1, e)}>
          <div>
            Attacking Player Code:
            <input name="attackingPlayerCode" value={this.state.attackingPlayerCode} onChange={this.handleInputChange} type="text" placeholder="BLAH#123" />
          </div>
          <div>
            Attacking Character:
            <select name="attackingCharacter" value={this.state.attackingCharacter} onChange={this.handleInputChange}>
              {createDropdownOptions(characters)}
            </select>
          </div>
          <div>
            Defending Player Code:
            <input name="defendingPlayerCode" value={this.state.defendingPlayerCode} type="text" placeholder="BLAH#123" onChange={this.handleInputChange} />
          </div>
          <div>
            Defending Character:
            <select onChange={this.handleInputChange} name="defendingCharacter" value={this.state.defendingCharacter}>
              {createDropdownOptions(characters)}
            </select>
          </div>
          <div>
            Stage:
            <select onChange={this.handleInputChange} name="stage" value={this.state.stage}>
              {createDropdownOptions(stages)}
            </select> </div>
          <div>
            Did combo kill?:
            <input type="checkbox" onChange={this.handleInputChange} name="didKill" checked={this.state.didKill} />
          </div>
          <div>
            Minimum damage done:
            <input type="number" placeholder="Minimum %" onChange={this.handleInputChange} name="minimumDamage" value={this.state.minimumDamage} />
            Max damage done:
            <input type="number" placeholder="Max %" onChange={this.handleInputChange} name="maximumDamage" value={this.state.maximumDamage} />
          </div>
          <div>
            Minimum move count:
            <input type="number" placeholder="Minimum moves in combo" onChange={this.handleInputChange} name="minimumMove" value={this.state.minimumMove} />
            Max move count:
            <input type="number" placeholder="Max moves in combo" onChange={this.handleInputChange} name="maximumMove" value={this.state.maximumMove} />
          </div>
          <div>
            Moves:
            <span id="moveContainer"></span>
            <select name="moves" id="moves"></select>
          </div>
          <button type="submit">Click me</button>
        </form>
        {this.state.conversions.length > 0 &&
          <div>
            <ConversionTable conversions={this.state.conversions} onSortChange={this.sortConversions} />
            <button onClick={(e) => this.setPage(1, e)} disabled={!previousButtonEnabled}>First Page</button>
            <button onClick={(e) => this.setPage(this.state.pageNumber - 1, e)} disabled={!previousButtonEnabled}>Previous Page</button>
            {this.state.pageNumber} of {this.state.maxPageNumber}
            <button onClick={(e) => this.setPage(this.state.pageNumber + 1, e)} disabled={!nextButtonEnabled}>Next Page</button>
            <button onClick={(e) => this.setPage(this.state.maxPageNumber, e)} disabled={!nextButtonEnabled}>Last Page</button>
          </div>
        }

      </div>

    );
  }

}


function createDropdownOptions(data) {
  let options = data.map(x => <option key={x.key} value={x.key}>{x.name}</option>);
  options.unshift(<option key="" value="">Select a value...</option>)
  return options;
}


