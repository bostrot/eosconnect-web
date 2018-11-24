let express = require('express');
let helper = require('../helper');
let middle = require('./middle');
let EosEcc = require('eosjs-ecc');
let EosApi = require('eosjs-api');
let config = require('../config');
let eos = EosApi({httpEndpoint: config.api});
let jwt = require('jsonwebtoken');

let router = express.Router();

// load basic dashboard layout with login button
router.get('/', async (req, res) => {
    res.render('dashboard', {
        data: null,
        login_url: process.env.env === 'dev' ? '/auth?client_id=example.app&scopes=login&redirect_uri='+config.base_url+'/int/login' : 
            '/auth?client_id=eosconnect&scopes=login&redirect_uri='+config.base_url+'/int/apps'
    })
});

// coinpayments.net trade postback url - create sqlite db entry for new app
router.post(config.postback, async (req, res) => {
    try {
        var returned = req.body.custom.split(',');
        if (parseInt(req.body.status) >= 100 && parseInt(req.body.amount1) >= 5) {
            console.log('Payment successfully received.')
            helper.db.prepare('INSERT INTO apps (name, description, logo, redirect_uri, owner) VALUES (?,?,?,?,?)')
                .run([
                    returned[0], // name
                    returned[1], // description
                    returned[2], // logo
                    returned[3], // redirect urls
                    returned[4], // username
                ]);
        }
    } catch (e) {
        console.log(req.body)
    }
    res.send("OK")
});

// basic api auth scope
router.get('/auth', middle.validateAuth, (req, res) => {
    let scope_description = [];
    res.scopes.forEach(scope => {
        switch (scope) {
            case 'login':
                scope_description.push("verify your EOS identity");
                break;
            case 'accountcreate':
                scope_description.push("create new EOS accounts"); //not implemented
                break;
        }
    });
    res.render('auth', {scope_description, client: res.client, scopes: res.scopes, redirect_uri: res.redirect_uri});
});

// revoke current active token
router.post('/auth/token/revoke', async (req, res) => {
    let {authorization = null} = req.headers;
    let token = await helper.db.getToken(authorization);
    if (token.length !== 1) {
        res.status(404).json({error: "not_fount"});
    } else {
        helper.db.query("DELETE FROM token WHERE token = ?", [token[0].token], () => {
            res.json({status: "revoked"})
        })
    }
});

// authenticate with post request and validate keys
router.post('/auth', (req, res) => {
    let {client = null, redirect_uri = null, scopes = null} = req.session;
    let {username = null, pass = null} = req.body;
    if (!client || !redirect_uri || !scopes || !username || !pass) {
        res.status(400).render('error/400');
        console.log("error parameters")
    } else {
        let publicShould = EosEcc.privateToPublic(pass);
        eos.getAccount({account_name: username}).then(async data => {
            if (data.permissions[0].required_auth.keys.length > 0 && data.permissions[0].required_auth.keys[0].key === publicShould) {
                let token = jwt.sign({app: client.name, scopes, account: username}, helper.jwt_token);
                await helper.db.insertToken(client.name, username, token);
                res.redirect(redirect_uri + '?access_token=' + token + '&username=' + username + "&expires_in=3600");
            } else {
                res.render('error/wrong_key');
                console.log("error invalid key")
            }
        }).catch(error => {
            res.render('error/unknown_account');
            console.log("error invalid account: " + error)
        });
    }

});

module.exports = router;
