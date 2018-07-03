let helper = require('../helper');

async function validateAccessToken(req, res, next) {
    let {access_token = null} = req.query;
    if (!access_token) {
        access_token = req.session.access_token;
    }
    if (!access_token) {
        res.redirect('/')
    } else {
        access_token = await helper.db.getToken(access_token);
        if (access_token.length === 0) {
            res.redirect('/')
        } else {
            access_token = access_token[0];
            let app = await helper.db.getApp(access_token.client_id);
            if (app.length === 0) {
                res.redirect('/')
            } else {
                app = app[0];
                if (app.is_enabled === 1) {
                    req.session.access_token = access_token.token;
                    req.session.username = access_token.account;
                    req.session.client = access_token.client_id;
                    next();
                } else {
                    res.redirect('/')
                }
            }
        }
    }

}

async function validateNewApp(req, res, next) {
    let {app_name = null, description = null, previewimage = null, redirect_uris = null} = req.body;
    if (!app_name || !description || !previewimage || !redirect_uris) {
        res.status(400).render('error/400');
    } else {
        let app = await helper.db.getApp(app_name);
        if (app === null || app.length === 1 || app_name.trim().length < 4 || app_name.trim().length > 12) {
            console.log("invalid app name")
            res.render('error/new_app');
        } else {
            description = description.substr(0, 32);
            if (!previewimage.startsWith('https://cdn.pixelhosting.co')) {
                console.log("invalid logo");
                res.render('error/invalid_logo')
            } else {
                if (redirect_uris.length === 0) {
                    console.log('empty redirect uris')
                    res.render('error/empty_redirect_uris')
                } else {
                    redirect_uris = redirect_uris.split(/\n/);
                    console.log(redirect_uris);
                    let filtered_uris = [];
                    let uris_ok = true;
                    redirect_uris.forEach(url => {
                        if (!url.startsWith('https://') && !url.startsWith('http://')) {
                            console.log("uri fail:", url)
                            uris_ok = false;
                        } else {
                            filtered_uris.push(url.replace(/\r/, '').replace(/\n/, '').replace(/\t/, ''));
                        }
                    });
                    if (!uris_ok) {
                        res.render('error/redirect_uri_invalid')
                    } else {
                        req.session.newApp = {
                            name: app_name,
                            description,
                            logo: previewimage,
                            redirect_uri: filtered_uris
                        };
                        next();
                    }
                }

            }
        }
    }
}

async function validateAppUpdate(req, res, next) {
    let {client_id = null, description = null, previewimage = null, redirect_uris = null} = req.body;
    if (!client_id || !description || !previewimage || !redirect_uris) {
        res.status(400).render('error/400');
    } else {
        let app = await helper.db.getApp(client_id);
        if (app === null || app.length === 0 || app[0].owner !== req.session.username || app[0].is_enabled === 0) {
            res.render('error/403');
        } else {
            description = description.substr(0, 32);
            if (!previewimage.startsWith('https://cdn.pixelhosting.co')) {
                res.render('error/invalid_logo')
            } else {
                if (redirect_uris.length === 0) {
                    res.render('error/empty_redirect_uris')
                } else {
                    redirect_uris = redirect_uris.split(/\n/);
                    let filtered_uris = [];
                    let uris_ok = true;
                    redirect_uris.forEach(url => {
                        if (!url.startsWith('https://') && !url.startsWith('http://')) {
                            console.log("uri fail:", url)
                            uris_ok = false;
                        } else {
                            filtered_uris.push(url.replace(/\r/, '').replace(/\n/, '').replace(/\t/, ''));
                        }
                    });
                    if (!uris_ok) {
                        res.render('error/redirect_uri_invalid')
                    } else {
                        req.session.updateApp = {
                            name: client_id,
                            description,
                            logo: previewimage,
                            redirect_uri: filtered_uris
                        };
                        helper.db.query(
                            'UPDATE apps SET description = ?, logo = ?, redirect_uri = ? WHERE name = ?',
                            [description, previewimage, JSON.stringify(filtered_uris), client_id],
                            (err, result) => {
                                next();
                            }
                        )

                    }
                }

            }
        }
    }
}

async function validateAuth(req, res, next) {
    let {client_id, scopes, redirect_uri} = req.query;
    if (!client_id || !scopes || !redirect_uri) {
        res.render('404');
    } else {
        let app = await helper.db.getApp(client_id);
        redirect_uri = decodeURIComponent(redirect_uri);
        if (app.length === 1) {
            app = app[0];
            let redirect_uris = JSON.parse(app.redirect_uri);
            if (redirect_uris.includes(redirect_uri)) {
                scopes = scopes.split(',');

                scopes.forEach(scope => {
                    if (!helper.scopes.includes(scope)) {
                        console.error("error/invalid_scope")
                        res.render('error/invalid_scope');
                    }
                });
                res.client = app;
                res.redirect_uri = redirect_uri;
                res.scopes = scopes;
                req.session.client = app;
                req.session.redirect_uri = redirect_uri;
                req.session.scopes = scopes;
                next();
            } else {
                console.error("error/redirect_uri_invalid");
                res.render('error/redirect_uri_invalid');
            }
        } else {
            console.error("error/unknown_app");
            res.render('error/unknown_app');
        }
    }
}

module.exports = {
    validateAuth,
    validateAccessToken,
    validateNewApp,
    validateAppUpdate
}