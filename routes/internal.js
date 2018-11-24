let express = require('express');
let router = express.Router();
let helper = require('../helper');
let srs = require('secure-random-string');
let middle = require('./middle');

// dashboard with apps and descriptions
router.get('/', async (req, res) => {
    let apps = await helper.db.getAppsByOwner(req.session.username);
    res.render("int/dashboard", {apps})
});

// apps view
router.get('/apps', async (req, res) => {
    let apps = await helper.db.getAppsByOwner(req.session.username);
    res.locals.active = 'apps';
    if (req.query.tx !== undefined) {
        res.render('int/apps', {'apps': apps, 'tx': req.query.tx }) 
    } else {
        res.render('int/apps', {apps}) 
    }
});

// reset app to default settings
router.get('/apps/:client_id/reset', async (req, res) => {
    let app = await helper.db.getApp(req.params.client_id);
    if (app.length === 0 || app[0].owner !== req.session.username || app[0].is_enabled === 0) {
        res.status(403).render('error/403');
    } else {
        let secret = srs({length: 48});
        helper.db.prepare('UPDATE apps SET secret = ? WHERE name = ?').run([secret, req.params.client_id]);
        helper.db.prepare('DELETE FROM token WHERE client_id = ?').run([req.params.client_id]);
        res.redirect('/int/apps/' + req.params.client_id);
    }
});

// revoke apps access to account layout
router.get('/apps/:client_id/revoke', async (req, res) => {
    let app = await helper.db.getApp(req.params.client_id);
    if (app.length === 0 || app[0].owner !== req.session.username) {
        res.status(403).render('error/403');
    } else {
        helper.db.prepare('DELETE FROM token WHERE client_id = ?').run([req.params.client_id]);
        res.redirect('/int/apps/' + app[0].name);
    }
});

// show app edit layout
router.get('/apps/:client_id/edit', async (req, res) => {
    let app = await helper.db.getApp(req.params.client_id);
    if (app.length === 0 || app[0].owner !== req.session.username || app[0].is_enabled === 0) {
        res.status(403).render('error/403');
    } else {
        res.render('int/app_edit', {app: app});
    }
});

// post request to handle app edits
router.post('/apps/:client_id/edit', middle.validateAppUpdate, async (req, res) => {
    res.redirect('/int/apps/' + req.params.client_id);
});

// handle new apps -> deprecated. use postback handler in index.js
router.post('/apps/new', middle.validateNewApp, async (req, res) => {
    res.json({"status": "success"});
    console.log(req.body)
    const {stripeToken = null, stripeEmail = null} = req.body;
});

// show specific app's layout
router.get('/apps/:name', async (req, res) => {
    if (req.params.name !== "new") {
        let app = await helper.db.getApp(req.params.name);
        if (app.length === 0 || app[0].owner !== req.session.username || app[0].is_enabled === 0) {
            res.status(403).render('error/403');
        } else {
            let userCount = await helper.db.countUserByApp(app.name);
            res.render('int/app_detail', {'app': app[0], userCount});
        }
    } else {
        console.log(req.session.username);
        res.render('int/app_new', {'username': req.session.username});
    }
});

// check and load authorized layout
router.get('/authorized', async (req, res) => {
    var temp = helper.db.prepare('SELECT client_id FROM token WHERE account = ? GROUP BY(client_id)')
                    .all(req.session.username)
    res.render('int/authorized', {apps: temp});
});

// revoke authorized app
router.get('/authorized/:client_id/revoke', async (req, res) => {
    helper.db.prepare('DELETE FROM token WHERE account = ? and client_id = ?')
        .run([req.session.username, req.params.client_id]);
});

// end session
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/')
});

// redirect from login to internal dashboard
router.get('/login', async (req, res, next) => {
    res.redirect('/int');
});

module.exports = router;
