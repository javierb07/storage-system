var mongoose = require("mongoose");

// Define schemas
var containerSchema = new mongoose.Schema({
    nameID: String,
    localURL: String,
    author: {
        id: {
           type: mongoose.Schema.Types.ObjectId,
           ref: "User"
        },
        username: String
     },
    parts:[
        {
           type: mongoose.Schema.Types.ObjectId,
           ref: "Part"
        }
     ]
});

module.exports = mongoose.model("Container", containerSchema);