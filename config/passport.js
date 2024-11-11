// ==================
// Passport Google Authentication Setup
// ==================

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const userModel = require("../models/userSchema");
const dotenv = require("dotenv");

dotenv.config();

// Configure Passport to use Google OAuth 2.0
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists in the database
        const user = await userModel.findOne({ email: profile.emails[0].value });

        if (user) {
            // If the user exists but doesn't have a Google ID, update the record
            if (!user.googleId) {
                user.googleId = profile.id;
                await user.save();
            }
            return done(null, user); // Return the found user
        } else {
            // Create a new user if they do not exist
            const newUser = await userModel.create({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
            });
            return done(null, newUser); // Return the newly created user
        }
    } catch (error) {
        done(error, null); // Handle any errors
    }
}));

// Serialize user instance to the session
passport.serializeUser((user, done) => {
    done(null, user.id); // Store user ID in the session
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await userModel.findById(id); // Find the user by ID
        done(null, user); // Return the user object
    } catch (error) {
        done(error, null); // Handle any errors
    }
});

module.exports = passport; // Export the configured passport instance
