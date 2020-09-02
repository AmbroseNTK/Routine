
function Cache(){
        this.data = {};
}

Cache.instance = function(){
    if(Cache._cache === undefined){
        Cache._cache = new Cache();
    }
    return Cache._cache;
}

Cache.prototype.set = function(key,data){
    this.data[key] = data;
}

Cache.prototype.get = function(key){
    return this.data[key];
}


module.exports = Cache;