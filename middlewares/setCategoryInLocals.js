// ==========================
// Load Categories Middleware
// ==========================

const category = require(`../models/categorySchema`);

const loadCategoriesMiddleware = async (req, res, next) => {
    try {
        // Retrieve unblocked categories and make available in views
        const categories = await category.find({ isBlocked: false });
        res.locals.categories = categories;
        next();
    } catch (error) {
        console.error('Error fetching categories:', error);
        next();
    }
};

module.exports = loadCategoriesMiddleware;
