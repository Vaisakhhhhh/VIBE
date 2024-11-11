// ==================
// Admin Brand Controller
// ==================

const brandModel = require('../../models/brandSchema');

// Show brand with pagination
exports.showBrands = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 7;

    try {
        const offset = (page - 1) * limit;

        // Fetch brand and total count concurrently
        const [brands, totalBrands] = await Promise.all([
            brandModel.find().skip(offset).limit(limit),
            brandModel.countDocuments()
        ]);

        const totalPages = Math.ceil(totalBrands / limit);

        // Render the brand page with categories and pagination info
        res.render('admin/brand', { brands, currentPage: page, totalPages, limit });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Create a new brand
exports.createBrand = async (req, res) => {
    const { name } = req.body;

    try {
        // Check for existing category (case-insensitive)
        const existingbrand = await brandModel.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });

        if (existingbrand) {
            return res.status(409).json({ message: 'Brand already exists!' });
        }

        // Create the new brand
        await brandModel.create({ name: name });
        return res.status(201).json({ message: 'Brand created successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating brand');
    }
};

// Block or unblock a brand
exports.BlockUnblock = async (req, res) => {
    const brandId = req.params.id;
    const { block } = req.body; // true to block, false to unblock

    try {
        // Find the brand by ID
        const check = await brandModel.findById(brandId);

        if (!check) {
            return res.status(404).json({ message: 'brand not found' });
        }

        // Update the brand's isBlocked status
        check.isBlocked = block;
        await check.save();

        res.status(200).json({ message: block ? 'Brand blocked' : 'Brand unblocked' });
    } catch (error) {
        console.error('Error blocking/unblocking brand:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Edit an existing brand
exports.edit = async (req, res) => {
    const brandId = req.params.id;
    const { name } = req.body;

    try {
        // Check for existing brand (case-insensitive)
        const existingbrand = await brandModel.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });

        if (existingbrand) {
            if (existingbrand.id !== brandId) {
                return res.status(409).json({ message: 'Brand already exists!' });
            }
        }

        // Update the brand name
        await brandModel.findByIdAndUpdate(brandId, { name });

        res.status(200).json({ message: 'Brand updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update brand' });
    }
};
