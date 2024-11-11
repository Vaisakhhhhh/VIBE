// ==================
// User Authentication Middleware
// ==================

const userModel = require("../models/userSchema");

async function isAuthenticated(req, res, next) {
    try {
        // Check if user session exists
        if (req.session.user) {
            const user = await userModel.findOne({ email: req.session.user });

            // Redirect if user not found in the database
            if (!user) return res.redirect('/login');

            // Handle blocked user: destroy session and redirect with a message
            if (user.isBlocked) {
                delete req.session.user;
                req.session.save(err => {
                    if (err) {
                        console.error('Failed to destroy user session in UserAuthMiddleware');
                        return res.status(500).send('Session error');
                    }
                    req.session.userName = false;
                    res.redirect('/login?blocked=true');
                });
                return;
            }

            res.locals.userData = user || null ;

            next(); // Proceed if user exists and is not blocked
        } else {
            res.redirect(`/login`); // Redirect if session does not exist
        }
    } catch (error) {
        console.error('Authentication error:', error);
        res.redirect('/login'); // Redirect on error
    }
}

module.exports = isAuthenticated;
