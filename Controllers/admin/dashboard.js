// ==================
// Admin Dashboard Controller
// ==================


const orderModel = require('../../models/orderSchema');

// Render the admin dashboard
exports.dashboard = async (req, res) => {
    try {
        let { filter } = req.query;
        
        let dateRange = {
            'payment.paymentStatus': 'Completed',
            'items.status': 'Delivered'
        }

        switch (filter) {
            case 'daily': {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dateRange = {
                    ...dateRange,
                    createdAt: { $gte: today }
                };
                break;
            }
            case 'weekly': {
                const today = new Date();
                const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
                weekStart.setHours(0, 0, 0, 0);
                dateRange = {
                    ...dateRange,
                    createdAt: { $gte: weekStart }
                };
                break;
            }
            case 'monthly': {
                const today = new Date();
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                dateRange = {
                    ...dateRange,
                    createdAt: { $gte: monthStart }
                };
                break;
            }
            case 'yearly': {
                const today = new Date();
                const yearStart = new Date(today.getFullYear(), 0, 1);
                dateRange = {
                    ...dateRange,
                    createdAt: { $gte: yearStart }
                };
                break;
            }
            default:
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dateRange = {
                    ...dateRange,
                    createdAt: { $gte: today }
                }
                filter = 'daily'
        };


        const [totalSales, totalOrders, itemsSold, totalCustomers, topProducts, salesTrends, revenueByCategory, topBrands, topCategories] = await Promise.all([
            getTotalSales(dateRange),
            getTotalOrders(dateRange),
            getItemsSold(dateRange),
            getTotalCustomers(dateRange),
            getTopSellingProducts(dateRange),
            getSalesTrends(dateRange, filter),
            getRevenueByCategory(dateRange),
            getTopSellingBrands(dateRange),
            getTopSellingCategories(dateRange)
        ]);
        
        return res.render('admin/dashboard', { filter, totalSales, totalOrders, itemsSold, totalCustomers, topProducts, salesTrends, revenueByCategory, topBrands, topCategories });
    } catch (error) {
        console.log(error);
    }
};



// ----- Fetch Total Sales -----

async function getTotalSales (query) {
    const totalSales = await orderModel.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$payment.finalAmount" } } }
    ]);
    return totalSales[0]?.total || 0;
};


// ----- Fetch Total Orders -----

async function getTotalOrders (query) {
    const totalOrders = await orderModel.countDocuments(query);
    return totalOrders;
};


// ----- Fetch Items Sold -----

async function getItemsSold (query) {
    const itemsSold = await orderModel.aggregate([
        { $match: query },
        { $unwind: "$items" },
        { $group: { _id: null, totalItems: { $sum: "$items.quantity" } } }
    ]);
    return itemsSold[0]?.totalItems || 0;
}


// ----- Fetch Total Customers -----

async function getTotalCustomers (query) {
    const totalCustomers = await orderModel.distinct("customer.customerId", query);
    return totalCustomers.length;
}


// ----- Fetch Top-Selling Products -----

async function getTopSellingProducts (query) {
    const topProducts = await orderModel.aggregate([
        { $match: query },
        { $unwind: "$items"},
        {
            $group: {
                _id: "$items.productId",
                productName: { $first: "$items.productName" },
                totalSold: { $sum: "$items.quantity"},
                totalRevenue: { $sum: "$items.subtotal"}
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        { $unwind: "$productDetails" },
        {
            $project: {
                _id: 0,
                productId: "$_id",
                productName: 1,
                totalSold: 1,
                totalRevenue: 1,
                productImage: { $arrayElemAt: ["$productDetails.images", 0] },
            }
        },
        { $sort: { totalSold: -1} },
        { $limit: 5}
    ]);
    return topProducts;
}


// ----- Fetch Sales Trends Data -----

async function getSalesTrends(query, filter) {
    let groupByFormat;

    switch (filter) {
        case 'daily': 
            groupByFormat = { 
                $dateToString: { 
                    format: '%Y-%m-%d %H:%M', 
                    date: '$createdAt' 
                } 
            };
            break;
        case 'monthly': 
            groupByFormat = { 
                $dateToString: { 
                    format: '%Y-%U',
                    date: '$createdAt'
                } 
            };
            break;
        case 'yearly': 
            groupByFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
            break;
        default: 
            groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const salesTrends = await orderModel.aggregate([
        { $match: query },
        {
            $group: {
                _id: groupByFormat,
                revenue: { $sum: '$payment.finalAmount' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return salesTrends;
}



// ----- Fetch Revenue by Category Data -----

async function getRevenueByCategory(query) {
    const revenueByCategory = await orderModel.aggregate([
        { $match: query },
        { $unwind: "$items" },
        {
            $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        { $unwind: "$productDetails" },
        {
            $lookup: {
                from: "categories",
                localField: "productDetails.category",
                foreignField: "_id",
                as: "categoryDetails"
            }
        },
        { $unwind: "$categoryDetails" },
        {
            $group: {
                _id: "$categoryDetails.name",
                revenue: { $sum: "$items.subtotal" }
            }
        },
        { $sort: { revenue: -1 } }
    ]);

    return revenueByCategory;
}


// ----- Fetch Top-Selling Brands -----

async function getTopSellingBrands(query) {
    const topSellingBrands = await orderModel.aggregate([
        { $match: query },
        { $unwind: '$items' },
        {
            $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'product'
            }
        },
        { $unwind: '$product' },
        {
            $lookup: {
                from: 'brands',
                localField: 'product.brand',
                foreignField: '_id',
                as: 'brand'
            }
        },
        { $unwind: '$brand' },
        {
            $group: {
                _id: { brandId: '$brand._id', brandName: '$brand.name' },
                totalRevenue: { $sum: '$items.subtotal' },
                totalQuantity: { $sum: '$items.quantity' }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
    ]);

    return topSellingBrands;
}


// ----- Fetch Top-Selling Categories -----

async function getTopSellingCategories(query) {
    const topSellingCategories = await orderModel.aggregate([
        { $match: query },
        { $unwind: '$items' },
        {
            $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'product'
            }
        },
        { $unwind: '$product' },
        {
            $lookup: {
                from: 'categories',
                localField: 'product.category',
                foreignField: '_id',
                as: 'category'
            }
        },
        { $unwind: '$category' },
        {
            $group: {
                _id: { categoryId: '$category._id', categoryName: '$category.name' },
                totalRevenue: { $sum: '$items.subtotal' },
                totalQuantity: { $sum: '$items.quantity' }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
    ]);

    return topSellingCategories;
}

