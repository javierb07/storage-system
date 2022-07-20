var mongoose = require("mongoose"),
    passport = require("passport"),
    User     = require("./models/user");

function masterUser(){
    var newUser = new User({username: "C Design Lab"});
    User.register(newUser, "Purdue2020", function(err, user){
        if(err){
            return console.log(err.message);
        }
        passport.authenticate("local")(req, res, function(){
            console.log("Successfully created master user");
        });
    });
}

module.exports = masterUser;