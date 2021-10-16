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


