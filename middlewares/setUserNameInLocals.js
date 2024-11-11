// ==================
// Middleware: Set User Name in Response Locals
// ==================

function setUserInResponseLocals(req, res, next) {
    res.locals.user = req.session.userName || null; // Set user Name for all views
    // res.locals.userId = req.session.userId || null; // Set user ID for all views
    next();
}

module.exports = setUserInResponseLocals;
