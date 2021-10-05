
const { ipcRenderer } = require('electron');


async function startDatabaseLoading() {
  await ipcRenderer.invoke('execute', {
    name: 'startDatabaseLoading'
  });
}

function startingDatabaseLoad(obj) {
  document.getElementById('progress').hidden = false;
  document.getElementById('progress-bar').ariaValueMax = obj.fileCount;
}

function fileLoaded(obj) {
  let progressBar = document.getElementById('progress-bar');
  let fileNumber = obj.fileNumber;
  let percentage = (fileNumber / progressBar.ariaValueMax) * 100;
  progressBar.style.width = percentage + "%"
  document.getElementById('progress-text').innerHTML = `${fileNumber} of ${progressBar.ariaValueMax} replays loaded into database`;
  progressBar.ariaValueNow = fileNumber;
}

function startingConversionLoad(obj) {
  document.getElementById('conversionProgress').hidden = false;
  document.getElementById('conversionProgress-bar').ariaValueMax = obj.conversionCount;
  document.getElementById('conversionProgress-bar').style.width = '0%';
}

function conversionLoaded(obj) {
  let progressBar = document.getElementById('conversionProgress-bar');
  let conversionNumber = obj.conversionNumber;
  let percentage = (conversionNumber / progressBar.ariaValueMax) * 100;
  progressBar.style.width = percentage + "%"
  document.getElementById('conversionProgress-text').innerHTML = `${conversionNumber} of ${progressBar.ariaValueMax} conversions loaded from replay`;
  progressBar.ariaValueNow = conversionNumber;
}