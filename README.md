# EOSconnect
##### A slightly different eosconnect-web fork for the latest EOS API working with SQLite3 and own broadcaster.
##### Allow users to sign in to your application using their EOS account.

### Installation

Clone the repo and run 

    npm install
    
Create `config.js` in root folder. Then edit and add:

```
module.exports = {
    jwt_token: "RANDOM_STRING",
    postback: "/SOME_POSTBACK_URL",
    base_url: "https://eosconnect.me/",
    api: "https://eos.greymass.com",
    port: "3000",
};
```
    
### Run

    npm start
    
### Demo

A demo implementation can be found at [https://eosconnect.me](https://eosconnect.me).

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
    
Tokens are valid for 14200 seconds.

### Libaries

- nodeJs: [@wehmoen/ec-sdk](https://www.npmjs.com/package/@wehmoen/ec-sdk)    
