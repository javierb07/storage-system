var express     = require("express"),
    router      = express.Router(),
    Container   = require("../models/container"),
    Part        = require("../models/part"),
    middleware  = require("../middleware");

// Index route: Display all containers information
router.get("/", middleware.isLoggedIn, function(req, res){
    Container.find({}).populate("parts").exec(function(err, containers){
        if(err){
            req.flash("error", "Problem finding containers in database");
            console.log(err);
            res.render("error", {error: err});
        } else {
            res.render("index", {containers: containers});
        }
    })
 });

// Index route: Return all container information in JSON format
router.get("/json", middleware.isLoggedIn, function(req, res){
    Container.find({}, function(err, containers){
        if(err){
            console.log(err);
            res.render("error", {error: err});
        } else {
            res.json(containers)
        }
    })
 });

// Find by local URL: Return a container created and parts information in JSON format
router.post("/findByURL", middleware.isLoggedIn, function(req, res){
    var localURL = req.body.localURL;
    Container.find({localURL:localURL}).populate("parts").exec(function(err, container){
        if(err){
            console.log(err);
            res.render("error", {error: err});
        } else {
            var containerJSON = {};
            if(container.length > 0){
                containerJSON.nameID = container[0].nameID;
                containerJSON.id = container[0]._id;
                if(container[0].parts != undefined && container[0].parts.length > 0){
                    var currentPart = container[0].parts.slice(-1)[0];
                    containerJSON.partID = currentPart._id;
                    containerJSON.partName = currentPart.nameID;
                    containerJSON.weight = currentPart.weight;
                    containerJSON.zero_offset = currentPart.zero_offset;
                    containerJSON.calibration_factor = currentPart.calibration_factor;
                    containerJSON.quantity = currentPart.data.slice(-1)[0].quantity;
                }
            }
            res.json(containerJSON);
        }
    })
 });

// New route: Displays a form to create a container
router.get("/new", middleware.isLoggedIn, function(req, res){
    res.render("containers/new");
});

// Create route: It creates a new container, accessible through form or microcontroller request
router.post("/", middleware.isLoggedIn, function(req, res){
    // Create a container
    if (req.body.container != undefined){       // Handle form
        var container = req.body.container;
        var author = {
            id: req.user._id,
            username: req.user.username
        }
    } else {    // Handle microcontroller
        var container = req.body;
    }  
    var newContainer = {nameID: container.nameID, localURL: container.localURL, author: author}
    // Create a new container and save to DB
    Container.create(newContainer, function(err, newlyCreated){
        if(err){
            console.log(err);
            res.render("error", {error: err});
        } else {
            //redirect back to home page
            if (req.body.container == undefined){
                res.send(newlyCreated._id);
            } else {
                res.redirect("/containers");
            }
        }
    });
});

// Edit route: Displays form to edit a container
router.get("/:id/edit", middleware.checkContainerOwnership, function(req, res){
    Container.findById(req.params.id).populate("parts").exec(function(err, foundContainer){
        if (err){
            console.log(err);
            res.render("error", {error: err});
        } else {
            res.render("containers/edit", {foundContainer: foundContainer});
        }
    });
});

// Show route: Show a container
router.get("/:id", middleware.isLoggedIn, function(req, res){
    // Find and update the correct container
    Container.findById(req.params.id).populate("parts").exec(function(err, foundContainer){
       if(err){
           res.redirect("/containers");
           res.render("error", {error: err});
       } else {
           // Redirect somewhere(show page)
           res.render("containers/show", {foundContainer: foundContainer});
       }
    });
});

// Show route: return information in JSON of a container
router.get("/:id/json", middleware.isLoggedIn, function(req, res){
    // Find and update the correct container
    Container.findById(req.params.id).populate("parts").exec(function(err, foundContainer){
       if(err){
           res.redirect("/containers");
           res.json(err);
       } else {
           // Redirect somewhere(show page)
           res.json(foundContainer);
       }
    });
});

// Update route: Updates a container
router.put("/:id", middleware.checkContainerOwnership, function(req, res){
    // Find and update the correct container
     if(req.body){  // Handle form
        var container = req.body.container;
    } else {       // Handle microcontroller 
        var container = req.query;
    }
    Container.findByIdAndUpdate(req.params.id, container, function(err, updatedContainer){
        if(err){
            console.log(err);
            res.render("error", {error: err});
        } else {
            // Redirect somewhere(show page)
            res.redirect("/containers");
       }
    });
});

// Destroy route: Deletes a container
router.delete("/:id", middleware.checkContainerOwnership, function(req, res){
    Container.findByIdAndRemove(req.params.id, function(err){
       if(err){
            console.log(err);
            res.render("error", {error: err});
        } else {
           res.redirect("/containers");
       }
    });
 });

// Show route: Display part creation form
router.get("/parts/new", middleware.isLoggedIn, function(req, res){
    Container.find({}, function(err, containers){
        if(err){
            req.flash("error", "Problem finding containers in database");
            console.log(err);
            res.render("error", {error: err});
        } else {
            res.render("parts/new", {containers: containers});
        }
    });
 });
 
// Create route: It creates a new part, accessible through form or microcontroller request
router.post("/parts/new", middleware.isLoggedIn, function(req, res){
    // Create a container
    if(req.body){  // Handle form
        var part = req.body.part;
    } else {       // Handle microcontroller 
        var part = req.query;
    }
    var containerID = part.containerID;
    // Create a new container and save to DB
    Container.findById(containerID, function(err, foundContainer){
        if(err){
            console.log(err);
            res.render("error", {error: err});
        } else {
            Part.create(part, function(err, newPart){
                if(err){
                    console.log(err);
                    res.render("error", {error: err});
                } else {
                    var quantity = part.quantity;
                    newPart.nameID = part.nameID;
                    newPart.weight = part.weight;
                    newPart.zero_offset = part.zero_offset;
                    newPart.calibration_factor = part.calibration_factor;
                    newPart.data.push({quantity: quantity});
                    newPart.save();
                    foundContainer.parts.push(newPart);
                    foundContainer.save();
                    //redirect back to home page
                    res.redirect("/containers");
                }
            });
        }
    });
});

 module.exports = router;