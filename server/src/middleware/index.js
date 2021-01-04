var Container = require("../models/container");

var middlewareObj = {};

middlewareObj.isEmpty = function(obj){
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.body.token != undefined &&  req.body.token== "CDesignLabToken"){
        return next();
    } else {
        if(req.isAuthenticated()){
            return next();
        }
        req.flash("error", "You need to be logged in.");
        res.redirect("/landing");
    }
}

middlewareObj.isLoggedInIndex = function(req, res, next){
    if(req.body.token != undefined && req.body.token == "CDesignLabToken"){
        return next();
    } else {
        if(req.isAuthenticated()){
            return res.redirect("/containers");
        }
        next();
    }
}

middlewareObj.checkContainerOwnership = function(req, res, next) {
    if(req.body.token != undefined && req.body.token == "CDesignLabToken"){
        return next();
    } else {
        if(req.isAuthenticated()){
            Container.findById(req.params.id, function(err, foundContainer){
                if(err){
                    req.flash("error", "Container not found");
                    res.redirect("/containers");
                } else {
                    if(foundContainer.author.id == undefined){
                        next();
                    } else {
                        // does user own the container?
                        if(foundContainer.author.id.equals(req.user._id)) {
                            next();
                        } else {
                            req.flash("error", "You don't have permission to do that");
                            res.redirect("/containers");
                        }
                    }
                }
            });
        } else {
            req.flash("error", "You need to be logged in to do that");
            res.redirect("/containers");
        }
    }
}

middlewareObj.checkIsUser = function(req, res, next) {
    if(req.user.username == "C Design Lab"){
        return next();
    } else {
        if(req.isAuthenticated()){
            User.findById(req.params.user_id, function(err, foundUser){
                if(err){
                    req.flash("error", "User not found");
                    res.redirect("/containers");
                } else {
                    // Is the user trying to delete its own account?
                    if(foundUser.id.equals(req.user._id)) {
                        next();
                    } else {
                        req.flash("error", "You don't have permission to do that");
                        res.redirect("/containers");
                    } 
                }
            });
        } else {
            req.flash("error", "You need to be logged in to do that");
            res.redirect("/containers");
        }
    }
}

module.exports = middlewareObj;