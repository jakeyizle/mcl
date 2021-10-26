const {
  ipcRenderer
} = require('electron');
const Photon = require("electron-photon");
const {
  Characters,
  Stages,
  CharacterStrings,
  StageStrings,
  moves
} = require('../static/meleeIds.js');
var currentFileNumber = 1;
const {
  create,
  _
} = require('lodash');
const db = require('better-sqlite3')('melee.db');

document.addEventListener("DOMContentLoaded", async function () {
  addNavElements();
  refreshDropdowns();
});

const applicationIds = ['settings', 'main', 'playlists'];


//dont want to clutter the html more than i am
function refreshDropdowns() {
  let characterDropwndowns = ['attackingCharacter', 'defendingCharacter'];
  for (let characterDropdown of characterDropwndowns) {
    let dropdown = document.getElementById(characterDropdown);
    dropdown.innerHTML = '';
    dropdown.appendChild(createDropdownOption('', 'Select a Character'))
    for (let character of CharacterStrings.sort()) {
      let option = createDropdownOption(Characters[character], character);
      dropdown.appendChild(option);
    }
  }

  let stageDropdown = document.getElementById('stage');
  stageDropdown.innerHTML = '';
  stageDropdown.appendChild(createDropdownOption('', 'Select a Stage'))
  for (let stage of StageStrings.sort()) {
    let option = createDropdownOption(Stages[stage], stage);
    stageDropdown.appendChild(option);
  }

  let playlistDropdown = document.getElementById('playlistDropdown');
  playlistDropdown.innerHTML = ''
  playlistDropdown.appendChild(createDropdownOption('', 'Select a Playlist'))
  let playlists = db.prepare('SELECT * from playlists').all();
  for (let playlist of playlists) {
    let option = createDropdownOption(playlist.name, playlist.name);
    playlistDropdown.appendChild(option);
  }

  let moveDropdown = document.getElementById('moves');
  moveDropdown.innerHTML = ''
  moveDropdown.appendChild(createDropdownOption('', 'Select moves'));
  for (let move of moves) {
    let option = createDropdownOption(move.id, move.name);
    moveDropdown.appendChild(option);
  }
  let moveContainer = document.getElementById('moveContainer');
  moveDropdown.addEventListener('change', () => {
    console.log(moveDropdown.value);
    let newMove = document.createElement('button');
    newMove.setAttribute('class', 'btn btn-default');
    newMove.setAttribute('id', `${moveDropdown.value}`);    
    newMove.innerHTML = moves.find(x=>x.id == moveDropdown.value).name;
    moveContainer.appendChild(newMove);

    newMove.addEventListener('click', () => {
      newMove.remove();
    })
    moveDropdown.value = ''
  })
}

//doing this instead of hardcoding the nav elements
function addNavElements() {
  var parentElement = document.getElementById('navbar');
  for (let navItem of applicationIds) {
    let navItemElement = document.createElement('nav-item');
    navItemElement.setAttribute("id", navItem + 'nav');
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

function createDropdownOption(value, text) {
  let option = document.createElement('option');
  option.setAttribute('value', value);
  option.text = text;
  return option
}