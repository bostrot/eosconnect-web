# EOSconnect
##### A slightly different eosconnect-web fork for the latest EOS API working with SQLite3 and own broadcaster.
##### Allow users to sign in to your application using their EOS account.

### Installation

Clone the repo and run 

    npm install
    
Add env vars:

    stripeKey = Used for payments for new apps
    sessionKey = A random string. Used to encrypt session cookies
    db_user = Database user
    db_pass = Database password
    jwt_token = Random string.
    
### Run

    npm start
    
### Demo

A demo implementation can be found at [https://demo.eosconnect.app](https://demo.eosconnect.app).
The source code for this app is availabe on github: [https://github.com/wehmoen/eosconnect-example-nodejs-app](https://github.com/wehmoen/eosconnect-example-nodejs-app)


### API

*/users/me* - Get user profile (require valid access token)     


### Tokens

Tokens are created with JWT, the payload is public. Here is how it look:

    {
        "app": "app",
        "scopes": [
            "login"
        ],
        "account": "username"
    }
    
Tokens are valid for 3600 seconds.

### Libaries

- nodeJs: [@wehmoen/ec-sdk](https://www.npmjs.com/package/@wehmoen/ec-sdk)    
