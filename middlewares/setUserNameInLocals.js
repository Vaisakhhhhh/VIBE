// ==================
// Middleware: Set User Name in Response Locals
// ==================

function setUserInResponseLocals(req, res, next) {
    res.locals.user = req.session.userName || null; // Set user Name for all views
    res.locals.cart = null;
    res.locals.searchQuery = null;
    res.locals.wishlist = null;
    next();
}

module.exports = setUserInResponseLocals;
