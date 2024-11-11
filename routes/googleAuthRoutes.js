// ==================
// 1. Imports
// ==================
const express = require("express");
const passport = require("passport");
const router = express.Router();

// ==================
// 2. Google Authentication Routes
// ==================

// --- Initiate Google Authentication ---
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// --- Google Authentication Callback ---
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Handle blocked users
        if (req.user.isBlocked) {
            return res.redirect('/login?blocked=true');  // Redirect with blocked query parameter
        }

        // Store user information in session
        req.session.user = req.user.email;
        req.session.userId = req.user.id;
        const userName = req.user.name;
        const firstName = userName.split(' ')[0];
        req.session.userName = { name: firstName };

        // Redirect to the home page after successful authentication
        res.redirect('/home');
    }
);

// ==================
// 3. Export Router
// ==================
module.exports = router;
