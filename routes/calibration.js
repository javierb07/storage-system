var express     = require("express"),
    router      = express.Router(),
    axios       = require('axios').default,
    Container   = require("../models/container"),
    Part        = require("../models/part"),
    middleware  = require("../middleware");

// Calibration route: Show calibration page
router.get("/:id/:part_id/calibration", middleware.isLoggedIn, function(req, res){
    Container.findById(req.params.id, function(err, container){
        if(err){
            console.log(err);
            res.render("error", {error: err});
        } else {
            res.render("parts/calibration", {container: container});
        }
    });
});

// Calibration route: Start calibration process
router.get("/:id/:part_id/calibration/calibration", middleware.isLoggedIn, function(req, res){
    var ip = req.query.ip;
    axios.get("http://"+ip+"/calibration");
    res.send("done");
});

// Calibration route: Set zero offset
router.get("/:id/:part_id/calibration/zero_offset", middleware.isLoggedIn, function(req, res){
    var ip = req.query.ip;
    axios.get("http://"+ip+"/zero_offset");
    res.send("done");
});

// Calibration route: Set weight value
router.post("/:id/:part_id/calibration/weight_value", middleware.isLoggedIn, function(req, res){
    var ip = req.body.ip;
    var input = req.body.input;
    axios.post("http://"+ip+"/weight_value", input);
    res.send("done");
});

// Calibration route: Set part weight 
router.post("/:id/:part_id/calibration/part_weight", middleware.isLoggedIn, function(req, res){
    var ip = req.body.ip;
    var input = req.body.input;
    axios.post("http://"+ip+"/part_weight", input);
    res.send("done");
});

// Calibration route: Set part name 
router.post("/:id/:part_id/calibration/part_name", middleware.isLoggedIn, function(req, res){
    var ip = req.body.ip;
    var input = req.body.input;
    axios.post("http://"+ip+"/part_name", input);
    res.send("done");
});

module.exports = router;