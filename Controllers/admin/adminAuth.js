// ==================
// Admin Authentication Controller
// ==================

exports.login = (req, res) => {
    // Check if admin is already logged in
    if (req.session.admin) {
        return res.redirect('/admin/dashboard');
    }

    // Render the login page if not logged in
    res.render('admin/login');
};

exports.loginPost = (req, res) => {
    try {
        // Validate admin credentials
        if (process.env.ADMIN_EMAIL === req.body.email && process.env.ADMIN_PASS === req.body.password) {
            // Store admin email in session
            req.session.admin = req.body.email;

            // Respond with success message
            res.status(200).json({ message: 'Login Successful!' });
        } else {
            // Respond with unauthorized error
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        // Respond with a generic error message
        res.status(500).json({ message: 'An error occurred. Please try again later.' });
    }
};

exports.logout = (req, res) => {
    try {
        // Check if admin is logged in
        if (req.session.admin) {
            // Delete admin session
            delete req.session.admin;
            req.session.save(err => {
                if (err) {
                    return res.status(500).send('Logout failed');
                }
                // Redirect to login page after successful logout
                res.redirect('/admin/login');
            });
        } else {
            // If no admin session, redirect to login
            res.redirect('/admin/login');
        }
    } catch (error) {
        console.error(`Error while logging out: ${error}`);
        res.status(500).send('An error occurred during logout.');
    }
};
