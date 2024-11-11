
//=======================
// Product Controller
//======================

const productSchema = require(`../../models/productSchema`);
const categorymodel = require('../../models/categorySchema');
const brandModel = require('../../models/brandSchema');




// ------------------ Get Product Details ------------------

// Function to fetch and display details for a specific product along with similar products
exports.getProductDetails = async (req, res) => {

    // Get product ID from request parameters
    const productId = req.params.id;

    try {
        // Fetch product details by ID from database
        let product = await productSchema.findById(productId).populate('brand').populate('category');

        // If product is not found, return a 404 error response
        if (!product) {
            return res.status(404).send('Product not found');
        }
        if (product) {
            // converting to the plain object
            product = product.toObject();
            
            // Format price and discountPrice with commas
            product.price = new Intl.NumberFormat('en-US').format(product.price);
            product.discountPrice = new Intl.NumberFormat('en-US').format(product.discountPrice);
            
        }
        
        // Convert categoryId to string for bread crums
        const categoryId = product.category._id.toString()
    
        // Fetch similar products that are not blocked, with the latest created first
        let similarProducts = await productSchema.find({ isBlocked: false })
            .populate('category')
            .populate('brand')
            .sort({ createdAt: -1 })
            .limit(5);

        // Filter out products with not blocked categories
        similarProducts = similarProducts.filter(product => !product.category.isBlocked && !product.brand.isBlocked);

        // Format `discountPrice` and `price` with commas
        similarProducts = similarProducts.map(product => {
            return {
                ...product.toObject(),
                price: new Intl.NumberFormat('en-US').format(product.price),
                discountPrice: new Intl.NumberFormat('en-US').format(product.discountPrice),
            };
        });


        // Render the product details page with the product, similar products, and formatted discount price
        res.render('user/productDetail', { 
            product, 
            categoryId,
            similarProducts, 
            
        });
    } catch (error) {
        console.log(error); 
        res.status(500).send('Internal server error'); // Send 500 response if an error occurs
    }
};


// ----------------- Get All Products -------------------


// Function to fetch all products 
exports.getAllProducts = async (req, res) => {

    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Fetch all available brands and categories that are not blocked
        const brands = await brandModel.find({ isBlocked: false });
        const categories = await categorymodel.find({ isBlocked: false });
        
        // Fetch all products that are not blocked
        let [products, allProducts] = await Promise.all([
            productSchema.find({ isBlocked: false })
           .populate('category')
           .populate('brand')
           .skip(offset)
           .limit(limit),
            productSchema.countDocuments()
        ]);
        
        // Filter products with not blocked categories and brands
        products = products.filter(product => !product.category.isBlocked && !product.brand.isBlocked);
        
        // Format `discountPrice` and `price` with commas
        products = products.map(product => {
            return {
                ...product.toObject(),
                price: new Intl.NumberFormat('en-US').format(product.price),
                discountPrice: new Intl.NumberFormat('en-US').format(product.discountPrice),
            };
        });

        const totalPages = Math.ceil(allProducts / limit);

        // render the all products page with all products
        res.render('user/allProducts', {products, brands, categories, currentPage: page, totalPages, limit});


    } catch (error) {
        console.log(error);
        res.status(500).send('Internal server error!!!') // Send 500 response if an error occurs
    }
}


// --------------------- Get Filtered Products --------------------

exports.getFilteredProducts = async (req, res) => {
    try {
        const { categories, brands, priceRange, discount, sort, categoryId, page = 1, limit = 10 } = req.query;

        // Base query for products that are not blocked
        let query = { isBlocked: false };

        // Apply category filter if categories are selected
        if (categories) {
            const categoryArray = categories.split(",");
            query.category = { $in: categoryArray };
        }

        if (categoryId) {
            query.category = categoryId;
        }

        // Apply brands filter if brands are selected
        if (brands) {
            const brandArray = brands.split(",");
            query.brand = { $in: brandArray };
        }

        // Apply price range filter
        if (priceRange) {
            if (priceRange === 'below_1000') query.discountPrice = { $lt: 1000 };
            if (priceRange === '1000_5000') query.discountPrice = { $gte: 1000, $lte: 5000 };
            if (priceRange === '5000_10000') query.discountPrice = { $gte: 5000, $lte: 10000 };
            if (priceRange === 'above_10000') query.discountPrice = { $gte: 10000 };
        }

        // Apply discount filter
        if (discount) {
            const discountValue = parseInt(discount);
            query.discount = { $gte: discountValue };
        }

        // Sorting Option
        let sortCriteria = {};
        switch (sort) {
            case 'price_--_low_to_high':
                sortCriteria = { discountPrice: 1 };
                break;
            case 'price_--_high_to_low':
                sortCriteria = { discountPrice: -1 };
                break;
            case 'newest_first':
                sortCriteria = { createdAt: -1 };
                break;
            case 'discount':
                sortCriteria = { discount: -1 };
        }

        // Pagination variables
        const pageInt = parseInt(page);
        const limitInt = parseInt(limit);
        const skip = (pageInt - 1) * limitInt;

        // Fetch products with pagination and sorting
        let filteredProducts = await productSchema.find(query)
            .populate('category')
            .populate('brand')
            .sort(sortCriteria)
            .skip(skip)
            .limit(limitInt);

        // Filter products with non-blocked categories and brands
        filteredProducts = filteredProducts.filter(product => !product.category.isBlocked && !product.brand.isBlocked);

        // Format `discountPrice` and `price` with commas
        filteredProducts = filteredProducts.map(product => ({
            ...product.toObject(),
            price: new Intl.NumberFormat('en-US').format(product.price),
            discountPrice: new Intl.NumberFormat('en-US').format(product.discountPrice),
        }));

        // Count total products for pagination metadata
        const totalProducts = await productSchema.countDocuments(query);

        // Calculate total pages
        const totalPages = Math.ceil(totalProducts / limitInt);

        // Send filtered products with pagination info
        res.json({
            products: filteredProducts,
            currentPage: pageInt,
            totalPages: totalPages,
            totalProducts: totalProducts
        });

    } catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
};



// -------------------------- Get Single Category Products ----------------------------


exports.getSingleCategory = async (req, res) => {
   try {

    const categoryId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page -1) * limit;
    
    // Fetch all available brands
    const brands = await brandModel.find({ isBlocked: false });

    // Fetch category by categoryId
    const category = await categorymodel.findById(categoryId);

    // Fetch products that are not blocked and category field match categoryId
    let singleCategoryProducts = await productSchema.find({ isBlocked: false, category: categoryId})
    .populate('category')
    .populate('brand')
    .skip(offset)
    .limit(limit);
    
    // Filter products that are not blocked categories and brands
    singleCategoryProducts = singleCategoryProducts.filter(product => !product.category.isBlocked && !product.brand.isBlocked);

     // Format `discountPrice` and `price` with commas
     singleCategoryProducts = singleCategoryProducts.map(product => {
        return {
            ...product.toObject(),
            price: new Intl.NumberFormat('en-US').format(product.price),
            discountPrice: new Intl.NumberFormat('en-US').format(product.discountPrice),
        };
    });

    const totalCount = await productSchema.countDocuments({ isBlocked: false, category: categoryId });

    const totalPages = Math.ceil(totalCount / limit);

    // Render the single category page with single category products
    res.render('user/singleCategory', { singleCategoryProducts, brands, category, currentPage: page, totalPages, limit });

   } catch (error) {
    console.log(error);
    res.status(500).send('Internal server error');
   }
}


