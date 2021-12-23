const db = require('better-sqlite3')('melee.db');

console.log('start');
const start = Date.now();
let query = 'SELECT * FROM conversions';
let results = db.prepare(query).all();
console.log('finish - ', Date.now()-start);
// ipcRenderer.send('databaseLoadFinished', results.length)