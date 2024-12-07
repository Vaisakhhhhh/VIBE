// ==================
// Admin Authentication Middleware
// ==================

//* Middleware function to check if an admin is authenticated
function adminAuth(req, res, next) {
    // Check if there is an active admin session
    if (req.session.admin) {
       
        next();
    } else {
        // If not authenticated, redirect to the admin login page
        res.redirect(`/admin/login`);
    }
}

// Export the middleware to be used in other parts of the application
module.exports = adminAuth;
