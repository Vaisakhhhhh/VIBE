// ==================
// Admin Category Controller
// ==================

const category = require('../../models/categorySchema');

// Show categories with pagination
exports.showCategory = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 7;

    try {
        const offset = (page - 1) * limit;

        // Fetch categories and total count concurrently
        const [categories, totalCategories] = await Promise.all([
            category.find().skip(offset).limit(limit),
            category.countDocuments()
        ]);

        const totalPages = Math.ceil(totalCategories / limit);

        // Render the category page with categories and pagination info
        res.render('admin/category', { categories, currentPage: page, totalPages, limit });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Create a new category
exports.createCategory = async (req, res) => {
    const { name, description } = req.body;

    try {
        // Check for existing category (case-insensitive)
        const existingCategory = await category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });

        if (existingCategory) {
            return res.status(409).json({ message: 'Category already exists!' });
        }

        // Create the new category
        await category.create({ name: name , description: description});
        return res.status(201).json({ message: 'Category created successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating category');
    }
};

// Block or unblock a category
exports.BlockUnblock = async (req, res) => {
    const categoryId = req.params.id;
    const { block } = req.body; // true to block, false to unblock

    try {
        // Find the category by ID
        const check = await category.findById(categoryId);

        if (!check) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Update the category's isBlocked status
        check.isBlocked = block;
        await check.save();

        res.status(200).json({ message: block ? 'Category blocked' : 'Category unblocked' });
    } catch (error) {
        console.error('Error blocking/unblocking category:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Edit an existing category
exports.edit = async (req, res) => {
    const categoryId = req.params.id;
    const { name, description } = req.body;

    try {
        // Check for existing category (case-insensitive)
        const existingCategory = await category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });

        if (existingCategory) {
            if (existingCategory.id !== categoryId) {
                return res.status(409).json({ message: 'Category already exists!' });
            }
        }

        // Update the category name
        await category.findByIdAndUpdate(categoryId, { name, description });

        res.status(200).json({ message: 'Category updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update category' });
    }
};
