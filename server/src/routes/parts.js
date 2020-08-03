var express     = require("express"),
    router      = express.Router({mergeParams: true}),
    Container   = require("../models/container"),
    Part        = require("../models/part"),
    middleware  = require("../middleware");

// Show route for web browser client: Displays timestamps of the part
router.get("/:part_id/", middleware.isLoggedIn, function(req, res){
    Part.findById(req.params.part_id, function(err, foundPart){
        if(err){
            console.log(err);
            res.render("error", {error: err});
        } else {
            foundPart.cotainerID = req.params.id;
            res.render("parts/show", {foundPart: foundPart});
        }
    })
 });

// Show route for Unity client: Returns JSON with timestamps of the part
 router.get("/:part_id/json", middleware.isLoggedIn, function(req, res){
    Part.findById(req.params.part_id, function(err, foundParts){
        if(err){
            console.log(err);
            res.json(err);
        } else {
            res.json(foundParts);
        }
    })
 });

// Create route: It creates a new part associated to a container
router.post("/", middleware.isLoggedIn, function(req, res){
    // Find the associated container
    Container.findById(req.params.id, function(err, container){
        if (err) {
            console.log(err);
            res.render("error", {error: err});
        } else {
            // Create a part
            if(req.body.part != undefined){  // Handle form
                var part = req.body.part;
            } else {       // Handle microcontroller 
                var part = req.body;
            }
            // Create a new part and save to DB
            Part.create(part, function(err, newPart){
                if(err){
                    console.log(err);
                    res.render("error", {error: err});
                } else {
                    if(!middleware.isEmpty(part)){
                        var quantity = part.quantity;
                        newPart.nameID = part.nameID;
                        newPart.weight = part.weight;
                        newPart.zero_offset = part.zero_offset;
                        newPart.calibration_factor = part.calibration_factor;
                        newPart.data.push({quantity: quantity});
                    }
                    newPart.save();
                    container.parts.push(newPart);
                    container.save();
                    if(req.body.token){
                        res.send(newPart._id);
                    } else {
                        // redirect back 
                        res.redirect("/containers");
                    }
                }
            });
        } 
    })
});

// Update route: It updates a part associated to a container, accessible through form or microcontroller request
router.put("/:part_id", middleware.checkContainerOwnership, function(req, res){
    // Update a part
    if(req.body.part != undefined){  // Handle form
        var part = req.body.part;
    } else {       // Handle microcontroller 
        var part = req.body;
    }
    // Find a part and update it 
    Part.findByIdAndUpdate(req.params.part_id, part, function(err, updatedPart){
        if(err){
            console.log(err);
            res.render("error", {error: err});
        } else {
            var quantity = part.quantity;
            updatedPart.nameID = part.nameID;
            updatedPart.weight = part.weight;
            updatedPart.zero_offset = part.zero_offset;
            updatedPart.calibration_factor = part.calibration_factor;
            updatedPart.data.push({quantity:quantity});
            updatedPart.save();
            if(req.body.part == undefined){  // Handle form
                res.send("Updated the part");
            } else {
                // redirect back 
                res.redirect("/containers");
            }
        }
    });
});

// Edit route: Displays form to edit part
router.get("/:part_id/edit", middleware.checkContainerOwnership, function(req, res){
    Part.findById(req.params.part_id, function(err, foundPart){
        if(err){
            console.log(err);
            res.render("error", {error: err});
        } else {
            foundPart.cotainerID = req.params.id;
            res.render("parts/edit", {foundPart: foundPart});
        }
    });
})

// Destroy route: Deletes a part
router.delete("/:part_id", middleware.checkContainerOwnership, function(req, res){
    Part.findByIdAndRemove(req.params.part_id, function(err){
        if(err){
            console.log(err);
            res.render("error", {error: err});
        } else {
            res.redirect("/containers");
        }
     });
 });

module.exports = router;