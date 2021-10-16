var conversions;
var currentSortField;
var pageNumber;
const countStmt = db.prepare('SELECT COUNT (*) FROM conversions').pluck();
var itemsPerPage = 20;

function searchConversions(newPageNumber = 1) {
    pageNumber = newPageNumber;
    let offset = (pageNumber-1)*20;

    //TODO build query better
    let attackingPlayerCode = document.getElementById('attackingPlayerCode').value;
    let attackingCharacter = document.getElementById('attackingCharacter').value;
    let defendingPlayerCode = document.getElementById('defendingPlayerCode').value;
    let defendingCharacter = document.getElementById('defendingCharacter').value;
    let stage = document.getElementById('stage').value;
    let didKill = document.getElementById('didKill').checked;
    let minimumDamage = document.getElementById('minimumDamage').value;
    // let itemsPerPage = document.getElementById('itemsPerPage').value || 20;

    let queryObject = {};

    let baseQuery = 'SELECT * FROM conversions WHERE 1=1';
    if (attackingPlayerCode) {
        baseQuery += ' AND attackingPlayer = @attackingPlayerCode'
        queryObject.attackingPlayerCode = attackingPlayerCode;
    };
    if (attackingCharacter) {
        baseQuery += ' AND attackingCharacter = @attackingCharacter'
        //parseint needed for sqlite comparison
        queryObject.attackingCharacter = parseInt(attackingCharacter);
    };
    if (defendingPlayerCode) {
        baseQuery += ' AND defendingPlayer = @defendingPlayerCode'
        queryObject.defendingPlayerCode = defendingPlayerCode;
    };
    if (defendingCharacter) {
        baseQuery += ' AND defendingCharacter = @defendingCharacter'
        queryObject.defendingCharacter = parseInt(defendingCharacter);
    };
    if (stage) {
        baseQuery += ' AND stage = @stage'
        queryObject.stage = parseInt(stage);
    };
    if (didKill) {
        baseQuery += ' AND didKill = 1'
        //special case cause sqlite doesnt store true/false?
    };
    if (minimumDamage) {
        baseQuery += ' AND percent >= @minimumDamage'
        queryObject.minimumDamage = parseInt(minimumDamage);
    };
    baseQuery += ` LIMIT ${itemsPerPage} OFFSET ${offset}`
    console.log(baseQuery);
    let query = db.prepare(baseQuery);
    conversions = queryObject ? query.all(queryObject) : query.all();
    //this is crazy slow
    // conversions.forEach(conversion => {
    //     conversions.moveCount = moveQuery.get(conversion.id);
    // })
    clearAndCreateRows();
    document.getElementById('pageNumbers').style.display = 'block';
    currentSortField = '';

    //temporarily moving arrow logic here
    //page number logic
    let maxPageCount = getMaxPageCount(itemsPerPage);    
    document.getElementById('pageNumber').innerHTML = `${pageNumber} of ${maxPageCount}`;
    if (pageNumber == 1) {
        document.getElementById('previousPage').disabled = 'true';
    } else {
        document.getElementById('previousPage').removeAttribute('disabled');
    }
    if (pageNumber === maxPageCount) {
        document.getElementById('nextPage').disabled = 'true';
    } else {
        document.getElementById('nextPage').removeAttribute('disabled');

    }


}

function sortConversions(field) {
    //sort by desc by default
    if (currentSortField == field) {
        conversions = conversions.map(conversions.pop, [...conversions]);
    } else {
        conversions = conversions.sort((a, b) => {
            return b[field] - a[field];
        })
    }
    clearAndCreateRows();

    currentSortField = field;
}


function clearAndCreateRows() {

    //table and row creation
    let tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    let fields = ['playReplay', 'attackingPlayer', 'attackingCharacter', 'defendingPlayer', 'defendingCharacter', 'stage', 'percent', 'time', 'didKill', 'moveCount']
    let header = document.getElementById('tableHeader');
    header.innerHTML = '';
    for (let field of fields) {
        //table header
        let headerElement = document.createElement('th');
        headerElement.innerHTML = field;
        headerElement.addEventListener('click', () => {
            sortConversions(field);
        });
        header.appendChild(headerElement);
    }


    for (let conversion of conversions) {
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
                    playConversion(conversion.filepath, conversion.startFrame, conversion.endFrame)
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

function getMaxPageCount() {
    let count = countStmt.get();
    return Math.ceil(count / itemsPerPage);
}