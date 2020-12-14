var express     = require("express"),
    router      = express.Router(),
    passport    = require("passport"),
    User        = require("../models/user"),
    middleware  = require("../middleware");

// Root route
router.get("/", middleware.isLoggedInIndex, function(req, res){
    res.render("landing");
});

// Show register form
router.get("/register", middleware.isLoggedIn, function(req, res){
    res.render("register"); 
 });

// Handle sign up logic
router.post("/register", middleware.isLoggedIn, function(req, res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            req.flash("error", err.message);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function(){
           req.flash("success", "Sigend up new user: " + user.username);
           res.redirect("/index"); 
        });
    });
});

// Handle login logic
router.post("/landing", passport.authenticate("local", 
    {
        successRedirect: "/containers",
        failureRedirect: "/landing"
    }
    ), function(req, res){
});

// Logout route
router.get("/logout", middleware.isLoggedIn, function(req, res){
   var user = req.user.username;
   req.logout();
   req.flash("success", user + " was logged out.");
   res.redirect("/landing");
});

// Camera route
router.get("/camera", middleware.isLoggedIn, function(req, res){
    res.render("cam");
});

 // Show list of registered users
 router.get("/users", middleware.isLoggedIn, function(req, res){
    User.find({}, function(err, users){
        if(err){
            req.flash("error", "Problem finding users in database");
            console.log(err);
            res.render("error", {error: err});
        } else {
            res.render("users", {users: users});
        }
    })
 });

 // Return list of registered users as JSOn
 router.get("/users/json", middleware.isLoggedIn, function(req, res){
    User.find({}, function(err, users){
        if(err){
            req.flash("error", "Problem finding users in database");
            console.log(err);
            res.json(err);
        } else {
            res.json(users);
        }
    })
 });

 // Delete a user
 router.delete("/users/:user_id", middleware.isLoggedIn, function(req, res){
    User.findById(req.params.user_id, function(err, user){
        if(err){
            req.flash("error", "Problem removing user from database");
            console.log(err);
            res.render("error", {error: err});
        } else {
            if(user.username === "C Design Lab"){      
                return  res.redirect("/users");          
            }
            user.remove();
            res.redirect("/users");
        }
    })
 });

 // RESTful routes 
router.get("/REST", middleware.isLoggedIn, function(req, res){
    res.render("REST");
});

 // About route to describe the system 
 router.get("/about", middleware.isLoggedIn, function(req, res){
    res.render("about");
});

module.exports = router;