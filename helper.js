let config = require('config');
let db = require('better-sqlite3')('eosconnect.db');

// create sqlite tables
db.prepare(`CREATE TABLE IF NOT EXISTS apps( id int auto_increment primary key, 
    name varchar(12) not null, description varchar(2048) null, logo mediumtext not null, 
    is_enabled integer(1) default 1, redirect_uri json not null, 
    owner varchar(12) default 'steemthebest' not null, constraint apps_name_uindex unique (name));`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS token ( id int auto_increment 
    primary key, account varchar(12) not null, token varchar(512) null, created datetime null, 
    client_id varchar(12) null);`).run();

// remove expired tokens every minute
function removeExpiredTokens() {
    removeExpired = db.prepare("DELETE FROM token WHERE created < date('now', '-4 hour');").run();
    console.log('Removed ' + removeExpired.changes + ' expired tokens.');
}
removeExpiredTokens();
setInterval(() => {
    removeExpiredTokens();
}, 1000 * 60)

// get user account for app
db.countUserByApp = async (name) => {
    return new Promise((resolve, reject) => {
        var temp = db.prepare('SELECT account FROM token WHERE client_id = ? GROUP BY account;').all(name);
        resolve(temp);
    })
};

// get app with user name
db.getApp = async (name) => {
    return new Promise((resolve, reject) => {
        var temp = db.prepare('SELECT * FROM apps WHERE name = ?').all(name);
        resolve(temp);
    })
};

// get all apps created by user
db.getAppsByOwner = async (owner) => {
    return new Promise((resolve, reject) => {
        var temp = db.prepare('SELECT * FROM apps WHERE owner = ?;').all(owner);
        resolve(temp);
    })
};

// verify token for auth
db.getToken = async (token) => {
    return new Promise((resolve, reject) => {
        var temp = db.prepare('SELECT * FROM token WHERE `token` = ?;').all(token);
        resolve(temp);
    })
};

// create token for auth
db.insertToken = async (app_name, username, token) => {
    return new Promise((resolve, reject) => {
        db.prepare('INSERT INTO token (account, token, client_id, created) VALUES (?,?,?,?);')
            .run([username, token, app_name, (new Date()).toISOString().slice(0, 19).replace('T', ' ')]);
        resolve(true);
    })
};

// log requests for debugging
db.log = async (app, ip, token, endpoint, body, account) => {
    return new Promise((resolve, reject) => {
        db.prepare('INSERT INTO log (client_id, ip_adress, access_token, endpoint, request_body, account, request) VALUES (?,?,?,?,?,?,?)')
            .get([app, ip, token, endpoint, body, account, (new Date()).toISOString().slice(0, 19).replace('T', ' ')]);
        resolve(true);
    })
};


module.exports = {
    db,
    scopes: ["login","accountcreate"],
    jwt_token: config.jwt_token
};