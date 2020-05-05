var express = require("express"),
    app = express(),
    server = require("http").Server(app),
    mongoose = require("mongoose"),
    bodyParser= require('body-parser'),
    methodOverride = require('method-override');

//Set up default mongoose connection
mongoose.connect('mongodb://mongo/parts-data',{ useNewUrlParser: true ,useUnifiedTopology: true});
//Get the default connection
var db = mongoose.connection;
//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const PORT = 80;    

// APP CONFIG
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(methodOverride('_method'));

// Define schemas
var partDataSchema = new mongoose.Schema({
    quantity: Number,
    created:  {type: Date, default: Date.now}
});
var PartData = mongoose.model("PartData",partDataSchema);

var partNameSchema = new mongoose.Schema({
    scaleID: String,
    name: String,
    weight: Number,
    zero_offset: Number,
    calibration_factor: Number,
    data: [partDataSchema]
});

var PartName = mongoose.model("PartName",partNameSchema);

// RESTFUL ROUTES
app.get("/", function(req, res){
    res.redirect("/parts");
});

// INDEX ROUTE (It should display all parts and information)
app.get("/parts", function(req, res){
    PartName.find({},function(err,parts){
        if(err){
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.send("404 Not Found");
        } else {
            res.render("index",{parts: parts});
        }
    })
 });

// INDEX ROUTE (It should return all parts information in JSON)
app.get("/parts/unity", function(req, res){
    PartName.find({},function(err,parts){
        if(err){
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.send("404 Not Found");
        } else {
            if (isEmpty(parts)){
                console.log("No parts");
            }
            for (var key in parts) {
                if (parts.hasOwnProperty(key)) {
                    parts[key].data.splice(0,parts[key].data.length -1);
                }
            }
            res.json(parts)
        }
    })
 });

 // NEW ROUTE (It displays a form to create a part)
app.get("/parts/new", function(req, res){
    res.render("new");
});

// CREATE ROUTE (It creates a new part, accessible through form or microcontroller request)
app.post("/parts", function(req, res){
    // Create part
    if(isEmpty(req.body)){  // Handle microcontroller 
        var partData = req.query;
    } else {    // Handle form
        var partData = req.body.part;
    }
    // Check if the part already exists
    PartName.find({name: partData.name, scaleID:partData.scaleID},function(err,parts){
        if(err){
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.send("404 Not Found");
        } else {
            // If the part doesn't exist yet, create it
            if(isEmpty(parts)){
                if(partData.name){
                    var partName = new PartName({scaleID: partData.scaleID, name: partData.name, weight: partData.weight, zero_offset: partData.zero_offset, calibration_factor: partData.calibration_factor});
                    partName.data.push({quantity: partData.quantity});
                    partName.save(function (err) {
                        if(err){
                            console.log(err);
                            res.writeHead(404, {'Content-Type': 'text/html'});
                            res.send("404 Not Found");
                        } else {
                            res.redirect("/parts");
                        }
                    });
                } else {
                    res.redirect("/parts");
                }
            } else {
                res.redirect("/parts");
            }
        }
    })
});

// SHOW ROUTEs
// Show route for web browser client
app.get("/parts/:scaleID/:name", function(req, res){
    PartName.find({name: req.params.name, scaleID: req.params.scaleID}, function(err, parts){
        if(isEmpty(parts)){
            res.redirect("/parts");
        } else {
            if(err){
                console.log(err);
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.send("404 Not Found");
            } else {
                res.render("show", {parts: parts});
            }
        }
    })
 });

// Show route for Unity client
 app.get("/parts/unity/:scaleID/:name", function(req, res){
    PartName.find({name: req.params.name, scaleID: req.params.scaleID}, function(err, parts){
        if(isEmpty(parts)){
            res.redirect("/parts");
        } else {
            if(err){
                console.log(err);
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.send("404 Not Found");
            } else {
                res.json(parts);
            }
        }
    })
 });

// EDIT ROUTE
app.get("/parts/:scaleID/:name/edit", function(req, res){
    PartName.find({name: req.params.name, scaleID: req.params.scaleID}, function(err, part){
        if(err){
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.send("404 Not Found");
        } else {
            res.render("edit", {part: part});
        }
    });
})

// UPDATE Calibration ROUTEs
app.put("/parts/calibration/:scaleID/:name", function(req, res){
    if(isEmpty(req.body)){  // Handle microcontroller 
        var partData = req.query;
    } else {    // Handle form
        var partData = req.body.part;
    }
    PartName.find({name: req.params.name, scaleID: req.params.scaleID}, function(err, part){
        if(err){
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.send("404 Not Found");
        } else {
            part[0].name = partData.name;
            part[0].weight = partData.weight;
            part[0].zero_offset = partData.zero_offset;
            part[0].calibration_factor = partData.calibration_factor;
            PartName.findByIdAndUpdate(part[0]._id,part[0],{new:true},function(err,part){
                if(err){
                    console.log(err);
                    res.writeHead(404, {'Content-Type': 'text/html'});
                    res.send("404 Not Found");
                } else {
                    res.redirect("/parts/:name");
                }
            });
        }
    });
})

// UPDATE ROUTEs
app.put("/parts/:scaleID/:name", function(req, res){
    if(isEmpty(req.body)){  // Handle microcontroller 
        var partData = req.query;
    } else {    // Handle form
        var partData = req.body.part;
    }
    PartName.find({name: req.params.name, scaleID: req.params.scaleID}, function(err, part){
        if(err){
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.send("404 Not Found");
        } else {
            part[0].data.push({quantity: partData.quantity});
            part[0].name = partData.name;
            part[0].weight = partData.weight;
            part[0].zero_offset = partData.zero_offset;
            part[0].calibration_factor = partData.calibration_factor;
            part[0].scaleID = partData.scaleID;
            PartName.findByIdAndUpdate(part[0]._id,part[0],{new:true},function(err,part){
                if(err){
                    console.log(err);
                    res.writeHead(404, {'Content-Type': 'text/html'});
                    res.send("404 Not Found");
                } else {
                    res.redirect("/parts/:name");
                }
            });
        }
    });
})

// DELETE ROUTE
app.delete("/parts/:scaleID/:name", function(req, res){
    //destroy part
    if(isEmpty(req.body)){  // Handle microcontroller 
        var partData = req.query;
    } else {    // Handle form
        var partData = req.body.part;
    }
    PartName.find({name:req.params.name, scaleID: req.params.scaleID}, function(err,part){
        if(err){
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.send("404 Not Found");
        } else {
            PartName.findById(part[0]._id,function(err, part){
                if(err){
                    console.log(err);
                    res.writeHead(404, {'Content-Type': 'text/html'});
                    res.send("404 Not Found");
                } else {
                    part.remove();
                    res.redirect("/parts");
                }
            });
        }
    });
 });

 // Show list RESTful routes
 app.get("/REST", function(req, res){
    res.render("REST");
 });
 
// Show calibration info route
app.get("/parts/info/:scaleID/:name", function(req, res){
    var partData = req.query;
    PartName.find({name: req.params.name, scaleID: req.params.scaleID}, function(err, part){
        if(err){
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.send("404 Not Found");
        } else {
            var info = {weight: part[0].weight, zero_offset: part[0].zero_offset, calibration_factor: part[0].calibration_factor};
            res.json(info);
        }
    });
 });

// INDEX ROUTE (It should display all parts and information)
app.get("/camera", function(req, res){
     res.render("cam");
 });

 // Catch all routes
 app.get('/*', function(req,res){
    res.redirect("/parts");
});

server.listen(PORT,function(eer){
    if (eer){
        console.log("Something went wrong.");
    } else {
        console.log("Server is running.");
    }
});

function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}