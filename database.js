const mongoose = require('mongoose');

function Database(){

}

Database.instance = function(){
    if(this._cache === undefined){
        this._cache = new Database();
    }
    return this._cache;
}

Database.prototype.connect = async function(connectionString){
    try {
        await mongoose.connect(connectionString, {useNewUrlParser: true});
        return true;
    }
    catch(e){
        return e;
    }
}

Database.prototype.init = async function(){

}

module.exports = Database;