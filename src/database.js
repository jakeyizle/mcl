const db = require('electron-db');

//The electron-db library doesn't use promises so wrote these functions to promisefy
module.exports = {
    createDatabase: async function createDatabase() {
        let tables = ['games', 'conversions', 'configuration'];
        tables.forEach(table => {   
            db.createTable(table,  (succ, data) => {
                console.log(`${table} | Succ - ${succ} | Msg - ${data}`);
            });        
            if (!db.valid(table)) {
                console.log('Recreating', table);
                db.clearTable(table);
                db.createTable(table,  (succ, data) => {
                    console.log(`${table} | Succ - ${succ} | Msg - ${data}`);
                }); 
            }
        })
        let config = await this.getAll('configuration');
        if (config.length == 0) {
            let data = {
                configId:'replayPath',
                'value': ''
            }
            console.log(data);
            await this.insertTableContent('configuration', data);
        }
    },

    insertTableContent: async function insertTableContent(table, obj) {
        return new Promise((resolve, reject) => {
            db.insertTableContent(table, obj, (succ, data) => {
                console.log("Success: " + succ);
                console.log("Message: " + data);
             resolve(data);
            })
         })
    },

    getAll: async function getAll(table) {
        return new Promise((resolve, reject) => {
            db.getAll(table, (succ, data) => {
                console.log("Success: " + succ);
                console.log("Message: " + data);
             resolve(data);
            })
         })
    },

    getRows: async function getRows(table, obj) {
        return new Promise((resolve, reject) => {
            db.getRows(table, obj, (succ, data) => {
                console.log("Success: " + succ);
                console.log("Message: " + data);
             resolve(data);
            })
         })
    },

    getField: async function getField(table, key) {
        return new Promise((resolve, reject) => {
            db.getField(table, key, (succ, data) => {
                console.log("Success: " + succ);
                console.log("Message: " + data);
             resolve(data);
            })
         })
    },

    updateRow: async function updateRow(table, where, set) {
        return new Promise((resolve, reject) => {
            db.updateRow(table, where, set, (succ, data) => {
                console.log("Success: " + succ);
                console.log("Message: " + data);
             resolve(data);
            })
         })
    },

    upsertRow: async function upsertRow(table, where, set, fullObject) {
        return new Promise(async(resolve, reject) => {
            let obj = await this.getRows(table, where);
            if (obj.length > 0) {
                db.updateRow(table, where, set, (succ, data) => {
                    console.log("Success: " + succ);
                    console.log("Message: " + data);
                 resolve(data);
                })
            } else {
                await this.insertTableContent(table, fullObject)
                resolve();
            }             
        })
    }
    
}