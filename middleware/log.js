const fs = require('fs');
const config = require('../config');


module.exports = function(req,res,next){
    try {
        if (this._cache === undefined) {
            this._cache = fs.createWriteStream(config["log-file"], {flags: 'a'});
        }
        this._cache.write(JSON.stringify({
            time: Date.now(),
            ip: req.ip,
            method: req.method,
            endpoint: req.originalUrl,
            params: req.params,
            query: req.query,
            token:req.headers.authorization
        }) + "\n");
    }
    catch(e){}
    next();
}