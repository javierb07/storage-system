var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var userSchema = new mongoose.Schema({
    username: String,
    password: String,
    date: {type: Date, default: Date.now}
});

userSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model("User", userSchema);