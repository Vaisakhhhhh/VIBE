
// ================================
// 1. Imports
//=================================
const express = require(`express`);
const session = require(`express-session`);
const nocache = require(`nocache`);
const path    = require(`path`);
const morgan = require(`morgan`);
const expressLayouts = require(`express-ejs-layouts`);
const passport = require(`./config/passport`);
require(`dotenv`).config();

// Import routes and database connection
const userRoutes = require(`./routes/user`);
const adminRoutes = require(`./routes/admin`);
const googleAuthRouter = require(`./routes/googleAuthRoutes`);
const connectDB = require(`./config/connection`)


//=================================
// 2. Initialize Express App
//=================================
const app = express();


//=================================
// 3. Connect to Database
//=================================
connectDB();


//=================================
// 4. Middlewares
//=================================

// Set cache control
app.use( nocache() );

// Session configuration
app.use(
    session({
        secret : "secret-key",
        resave : false,
        cookie : {maxAge : 1000 * 60 * 60 * 24},
        saveUninitialized : false
    })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// EJS Layouts and views setup
app.set(`views`, path.join(__dirname, `views`));
app.set(`view engine`, `ejs`);
app.use(expressLayouts);
app.set(`layout`, `layouts/layout`);

// Static files and request parsing
app.use(express.static( path.join(__dirname, `./public`)));
app.use(express.urlencoded({extended : true}));
app.use(express.json());
app.use(morgan(`dev`));

// Static uploads directory
app.use('/uploads', express.static('uploads'));

//=================================
// 5. Routes
//=================================


app.use(`/`, googleAuthRouter);
app.use(`/`, userRoutes);
app.use(`/admin`, adminRoutes);



// Global 404 Middleware
app.use((req, res, next) => {
   
    res.status(404).render('user/404');
});


// Global Error-Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(err.status || 500).render('user/500');
});

//=================================
// 6. Server Initialization
//=================================

const PORT = process.env.PORT || 8001;

app.listen(PORT, (error) => {

    if(error){
        console.log(`server failed to run on  http://localhost:${PORT}`);
        
    }else {
        console.log(`server successfully running on http://localhost:${PORT}`);
        
    }
});

