import * as React from 'react';
import ReactDOM from 'react-dom';
const { ipcRenderer } = require('electron')

ReactDOM.render(
  <App></App>,
  document.getElementById('react')
);

ipcRenderer.send('windowLoaded')