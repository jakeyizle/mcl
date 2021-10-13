const {
  ipcRenderer
} = require('electron');
const Photon = require("electron-photon");
const {Characters, Stages, CharacterStrings, StageStrings} = require('../static/meleeIds.js');
var currentFileNumber = 1;
const { exec } = require("child_process");
const fs = require('fs');
const path = require('path');
var spawn = require('child_process').spawn;    

document.addEventListener("DOMContentLoaded", async function() {
  addNavElements();
  populateDropdowns();

});

const applicationIds = ['settings', 'main'];


//dont want to clutter the html more than i am
function populateDropdowns() {
  let characterDropwndowns = ['attackingCharacter', 'defendingCharacter'];
  for (let characterDropdown of characterDropwndowns) {
    let dropdown = document.getElementById(characterDropdown);
    for (let character of CharacterStrings) {    
      let option = document.createElement('option');

      option.setAttribute('value', Characters[character]);
      option.text = character;
      dropdown.appendChild(option);
    }
    
  }
  let stageDropdown = document.getElementById('stage');
  for (let stage of StageStrings) {
    let option = document.createElement('option');
    option.setAttribute('value', Stages[stage]);
    option.text = stage;
    stageDropdown.appendChild(option);
  }

}

//doing this instead of hardcoding the nav elements
function addNavElements() {
  var parentElement = document.getElementById('navbar');
  for (let navItem of applicationIds) {
    let navItemElement = document.createElement('nav-item');
    navItemElement.setAttribute("id", navItem+'nav');
    navItemElement.innerHTML = navItem;


    navItemElement.addEventListener('click', () => {
      showAppAndHideOthers(navItem);
    });
    parentElement.appendChild(navItemElement);
    if (navItem === 'main') {
      navItemElement.click();
    }
  }
  
}

function showAppAndHideOthers(elementId) {
  for (let applicationId of applicationIds) {
    let element = document.getElementById(applicationId);
    element.style.display = (applicationId === elementId) ? 'block' : 'none';
  }
}

// function searchConversions() {
//   let tableBody = document.getElementById('tableBody');
//   tableBody.innerHTML = '';
//   //TODO build query better
//   let attackingPlayerCode = document.getElementById('attackingPlayerCode').value;
//   let attackingCharacter = document.getElementById('attackingCharacter').value;
//   let defendingPlayerCode = document.getElementById('defendingPlayerCode').value;
//   let defendingCharacter = document.getElementById('defendingCharacter').value;
//   let stage = document.getElementById('stage').value;
//   let didKill = document.getElementById('didKill').checked;
//   let minimumDamage = document.getElementById('minimumDamage').value;

//   let queryObject = {};

//   let baseQuery = 'SELECT * FROM conversions WHERE 1=1';
//   if (attackingPlayerCode) {
//     baseQuery += ' AND attackingPlayer = @attackingPlayerCode'
//     queryObject.attackingPlayerCode = attackingPlayerCode;
//   };
//   if (attackingCharacter) {
//     baseQuery += ' AND attackingCharacter = @attackingCharacter'
//     //parseint needed for sqlite comparison
//     queryObject.attackingCharacter = parseInt(attackingCharacter);
//   };
//   if (defendingPlayerCode) {
//     baseQuery += ' AND defendingPlayer = @defendingPlayerCode'
//     queryObject.defendingPlayerCode = defendingPlayerCode;
//   };
//   if (defendingCharacter) {
//     baseQuery += ' AND defendingCharacter = @defendingCharacter'
//     queryObject.defendingCharacter = parseInt(defendingCharacter);
//   };
//   if (stage) {
//     baseQuery += ' AND stage = @stage'
//     queryObject.stage = parseInt(stage);
//   };
//   if (didKill) {
//     baseQuery += ' AND didKill = 1'
//     //special case cause sqlite doesnt store true/false?
//   };
//   if (minimumDamage) {
//     baseQuery += ' AND percent >= @minimumDamage'
//     queryObject.minimumDamage = parseInt(minimumDamage);
//   };

//   let query = db.prepare(baseQuery);
//   let data = queryObject ? query.all(queryObject) : query.all();
  
//   let fields = ['playReplay','attackingPlayer','attackingCharacter','defendingPlayer','defendingCharacter','stage','percent','time','didKill']
//   let i = 0;
//   for (let conversion of data) {
//     let row = document.createElement('tr');
//     for (let field of fields) {
//       let cell = document.createElement('td');
//       if (field === 'attackingCharacter' ||field === 'defendingCharacter' || field === 'stage') {
//         //translate from ID to name
//         cell.innerHTML = field ==='stage' ? getKeyByValue(Stages, conversion[field]) : getKeyByValue(Characters, conversion[field]);
//       } else if (field === 'playReplay') {
//         let button = document.createElement("button");
//         button.innerHTML = "Play Replay";
//         button.addEventListener('click', () => {playConversion(conversion.filepath, conversion.startFrame, conversion.endFrame)});
//         cell.appendChild(button);
//       } else {
//         cell.innerHTML = conversion[field];
//       }
//       row.appendChild(cell);
//     }
//     tableBody.appendChild(row);
//     i++;
//     //TODO paging
//     if (i > 100) {break};
//   }
//   console.log(data);

// }

ipcRenderer.once('startGameLoading', (event, arg) => {
  console.log(1);
  console.log(arg);
  startingDatabaseLoad(arg);
})

ipcRenderer.on('gameLoaded', (event, arg) => {
  fileLoaded();
})


function startingDatabaseLoad(max) {
  document.getElementById('progress').hidden = false;
  document.getElementById('progress-bar').ariaValueMax = max;
}

function fileLoaded() {
  currentFileNumber++;
  let progressBar = document.getElementById('progress-bar');
  let percentage = (currentFileNumber / progressBar.ariaValueMax) * 100;
  progressBar.style.width = percentage + "%"
  document.getElementById('progress-text').innerHTML = `${currentFileNumber} of ${progressBar.ariaValueMax} replays loaded into database`;
  progressBar.ariaValueNow = currentFileNumber;
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function playConversion(filePath, startFrame, endFrame) {
  const settingsStmt = db.prepare('SELECT value from settings where key = ?');
  const playbackPath = settingsStmt.get('playbackPath').value;
  const isoPath = settingsStmt.get('isoPath').value;
    var output = {
      "mode": "queue",
      "replay": "",
      "isRealTimeMode": false,
      "outputOverlayFiles": true,
      "queue": []
      };
      var queueMessage = {
        "path":filePath,
        "startFrame": startFrame,
        "endFrame": endFrame
      };
      output.queue.push(queueMessage);     
      let jsonPath = path.join(__dirname, "tempMoments.json");
      //if i use the json directly it doesnt work, so have to write it to a file first
      fs.writeFileSync(jsonPath, JSON.stringify(output));
      var replayCommand = `"${playbackPath}" -i "${jsonPath}" -b -e "${isoPath}"`; 
      console.log(replayCommand);

      var dolphinProcess = exec(replayCommand);    
      dolphinProcess.stdout.on('data', (line) =>{        
        //we get [NO_GAME]            
        spawn("taskkill", ["/pid", dolphinProcess.pid, '/f', '/t']);
        })    
}