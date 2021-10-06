const {
  ipcRenderer
} = require('electron');
const Photon = require("electron-photon");

var currentFileNumber = 1;

document.addEventListener("DOMContentLoaded", async function() {
  addNavElements();
});

const applicationIds = ['settings', 'main'];


//add navigation elements
function addNavElements() {
  var parentElement = document.getElementById('navbar');
  let navItems = ['settings', 'main'];
  for (let navItem of navItems) {
    let navItemElement = document.createElement('nav-item');
    navItemElement.setAttribute("id", navItem+'nav');
    navItemElement.innerHTML = navItem;

    navItemElement.addEventListener('click', () => {
      showAppAndHideOthers(navItem);
    });
    parentElement.appendChild(navItemElement);

  }

}

function showAppAndHideOthers(elementId) {
  for (let applicationId of applicationIds) {
    let element = document.getElementById(applicationId);
    console.log(`elementid - ${elementId}`);
    console.log(`applicationId - ${applicationId}`);
    element.style.display = (applicationId === elementId) ? 'block' : 'none';
  }
}


async function startDatabaseLoading() {
  await ipcRenderer.invoke('execute', {
    name: 'startDatabaseLoading'
  });
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