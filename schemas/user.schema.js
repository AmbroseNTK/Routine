const mongoose = require('mongoose');
module.exports = new mongoose.Schema({
    uid:String,
    email:String,
    firstName:String,
    lastName:String,
    phoneNumber:String
});