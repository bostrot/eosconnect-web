// API handler
let express = require('express');
let router = express.Router();
let helper = require('../helper');
let EosEcc = require('eosjs-ecc');
let EosApi = require('eosjs-api');
let config = require('../config.js')
let eos = EosApi({httpEndpoint: config.api});
var jimp = require('jimp');

// generate profile picture with robohash.org
router.get('/v1/avatar/:username', (req, res) => {
    let {username = "steemthebest"} = req.params;
    let {size = 128} = req.query;
    size = parseInt(size);
    if (username.length !== 12) {
        username = "steemthebest";
    }
    jimp.read('https://robohash.org/' + username + '?set=set3', (err, image) => {
        image.resize(size, size).getBuffer('image/png', (err, buffer) => {
            res.set('Content-Type', 'image/png');
            res.send(buffer)
        }) 
    })
});

// check whether app exists
router.get('/v1/app/:client_id.exist', async (req, res) => {
    let app = await helper.db.getApp(req.params.client_id);
    res.json({"exist": app !== undefined})
});

// get app info
router.get('/v1/app/:client_id.info', async (req, res) => {
    let app = await helper.db.getApp(req.params.client_id);
    if (app !== undefined) {
        app = app[0]
        res.json({
            info: {
                name: app.name,
                description: app.description,
                logo: config.base_url + '/api/v1/app/' + app.name + '.logo',
                redirect_uri: JSON.parse(app.redirect_uri),
                is_enabled: app.is_enabled,
            },
            owner: {
                accountname: app.owner,
                avatar: config.base_url + '/api/v1/avatar/' + app.owner
            }
        })
    } else {
        res.json({})
    }
});

// router for app logos
router.get('/v1/app/:client_id.logo', async (req, res) => {
    let app = await helper.db.getApp(req.params.client_id);
    if (app !== undefined) {
        res.redirect(app[0].logo);
    } else {
        res.redirect('/assets/img/eos_color.svg');
    }
});

// check public keys to verify account
router.post('/v1/account/request', (req, res) => {
    let {accountname = null, owner_key = null, active_key = null} = req.body;
    if (!accountname || !owner_key | !active_key) {
        res.status(400).json({"error":"bad request"});
    } else {
        if (!EosEcc.isValidPublic(owner_key) || !EosEcc.isValidPublic(active_key)) {
            res.status(400).json({"error":"invalid owner or active key"});
        } else {
            if (accountname.length !== 12) {
                res.status(400).json({"error":"invalid account name length"});
            } else {
                eos.getAccount({account_name: accountname}).then(() => {
                    res.status(400).json({error:"username not available"});
                }).catch((e) => {
                    let purchaseData =  require('base-64').encode(JSON.stringify({n:accountname,o:owner_key,a:active_key}));
                    let response = {
                        token: purchaseData,
                        purchase_url: 'https://eos-account-creator.com/purchase/?d=' + purchaseData
                    };
                    res.json(response);
                })
            }
        }
    }
});

module.exports = router;