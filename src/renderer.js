import * as React from 'react';
import {createRoot}  from 'react-dom/client';
const { ipcRenderer } = require('electron')
const container = document.getElementById('react')
const root = createRoot(container);
root.render(<App />)

ipcRenderer.send('windowLoaded')