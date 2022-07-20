var mongoose = require("mongoose");

// Define schemas
var partSchema = new mongoose.Schema({
    nameID: String,
    weight: Number,
    zero_offset: Number,
    calibration_factor: Number,
    data:  [{quantity: Number, date: {type: Date, default: Date.now}}]
});

module.exports = mongoose.model("Part", partSchema);