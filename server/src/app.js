var express          = require("express"),
    app              = express(),
    bodyParser       = require("body-parser"),
    mongoose         = require("mongoose"),
    flash            = require("connect-flash"),
    passport         = require("passport"),
    LocalStrategy    = require("passport-local"),
    methodOverride   = require("method-override"),
    User             = require("./models/user"),
    middleware       = require("./middleware"),
    Master           = require("./master");

// Required routes
var indexRoutes      = require("./routes/index"),
    containerRoutes  = require("./routes/containers"),
    partRoutes       = require("./routes/parts")
    calibrationRoutes= require("./routes/calibration");

// Set up default mongoose connection
const host = process.env.HOST || "mongodb://localhost:27017/storage-system";
mongoose.connect(host,{ useNewUrlParser: true ,useUnifiedTopology: true}, function(err){
    if (err){
        console.log("Conection error to database")
    } else {
        console.log("Connected to database")
    }
});
// Get the default connection
var db = mongoose.connection;
// Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// App configuration
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));
app.use(flash());

// Passport configuration
app.use(require("express-session")({
    secret: "Convergence Design Lab",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
 });

// Use routes from less to more specific
app.use("/", indexRoutes);
app.use("/containers", containerRoutes);
app.use("/containers/:id", partRoutes);
app.use("/containers/", calibrationRoutes);

// Catch all other routes
app.get('/*', middleware.isLoggedInIndex, function(req,res){
    res.redirect("/");
});
const port = process.env.PORT || 80;
Master();   // Create the master user

app.listen(port, function(err){
    if (err){
        console.log("Something went wrong.");
    } else {
        console.log("Server is running.");
    }
});