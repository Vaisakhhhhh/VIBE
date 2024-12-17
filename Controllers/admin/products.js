// ====================
// Product Controller
// ====================

const path = require('path');
const fs = require('fs');
const category = require('../../models/categorySchema');
const productSchema = require('../../models/productSchema');
const brandModel = require('../../models/brandSchema');

// Get all products with pagination
exports.getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const [products, totalProducts] = await Promise.all([
            productSchema.find()
                .populate('category')
                .populate('brand')
                .sort({ createdAt: -1})
                .skip(offset)
                .limit(limit),
            productSchema.countDocuments()
        ]);

        const totalPages = Math.ceil(totalProducts / limit);

        res.render('admin/products', { products, currentPage: page, totalPages, limit });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Render form to add a new product
exports.getAddProduct = async (req, res) => {
    try {
        const categories = await category.find({ isBlocked: false });
        const brands = await brandModel.find({isBlocked: false});
        res.render('admin/addProduct', { categories, brands });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Add a new product
exports.postAddProduct = async (req, res) => {
    try {
        const {
            productName, description, price, discount, stock,
            warranty, brand, category, model, type, color, connectivity
        } = req.body;

        const images = req.files.map(file => file.filename);

        const newProduct = new productSchema({
            name: productName,
            description,
            price,
            discount,
            stock,
            warranty,
            brand,
            category,
            model_name: model,
            product_type: type,
            color,
            connectivity,
            images // Array of image filenames
        });

        await newProduct.save();
        res.status(200).json({ success: true, message: 'Product Successfully Added!' });
    } catch (error) {
        console.error('Failed to add product:', error);
        res.status(500).json({ message: 'Failed to add Product' });
    }
};

// Block or unblock a product
exports.BlockUnblock = async (req, res) => {
    const productId = req.params.id;
    const { block } = req.body;

    try {
        const product = await productSchema.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Update the product's isBlocked status
        product.isBlocked = block;
        await product.save();

        res.status(200).json({ message: block ? 'Product blocked' : 'Product unblocked' });
    } catch (error) {
        console.error('Error blocking/unblocking product:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Render form to edit a product
exports.getUpdateProduct = async (req, res) => {
    const productId = req.params.id;

    try {
        const product = await productSchema.findById(productId);
        const categories = await category.find({ isBlocked: false });
        const brands = await brandModel.find({ isBlocked: false });

        res.render('admin/editProduct', { product, categories, brands });
    } catch (error) {
        console.error('Error fetching product for editing:', error);
        res.status(500).send('Server Error');
    }
};

// Edit a product
exports.postEditProduct = async (req, res) => {
    const productId = req.params.id;
    const removedImages = JSON.parse(req.body.removedImages || '[]');
    const newImages = req.files;
    
    try {
        let product = await productSchema.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product Not Found!' });
        }

        // Update product fields
        Object.assign(product, req.body); 

        // Handle removed images
        if (removedImages.length > 0) {
            product.images = product.images.filter(img => !removedImages.includes(img));
            // Delete removed images from the server
            removedImages.forEach(image => {
                const filePath = path.join('uploads', image);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        // Add new images to the product
        if (newImages && newImages.length > 0) {
            newImages.forEach(file => {
                product.images.push(file.filename);
            });
        }

        // Save the updated product
        await product.save();
        res.status(200).json({ message: 'Product Updated Successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'An error occurred while updating the product!' });
    }
};
