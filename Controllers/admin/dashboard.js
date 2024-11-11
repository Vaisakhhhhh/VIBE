// ==================
// Admin Dashboard Controller
// ==================


// Render the admin dashboard
exports.dashboard = (req, res) => {
    // Check if the admin session exists
    if (req.session.admin) {
        // Render the dashboard view
        return res.render('admin/dashboard');
    }

    // Redirect to login if admin session does not exist
    res.redirect('/admin/login');
};
