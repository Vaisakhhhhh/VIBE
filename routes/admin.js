// ==================
// 1. Imports
// ==================
const express = require('express');
const router = express.Router();

// Middlewares 
const uploads = require('../middlewares/multerHandling');
const adminAuthMiddleware = require('../middlewares/adminAuthMiddleware');

// Controllers
const adminController = require('../Controllers/admin/adminAuth');
const dashboardController = require('../Controllers/admin/dashboard');
const userController = require('../Controllers/admin/customers');
const categoryController = require('../Controllers/admin/category');
const productController = require('../Controllers/admin/products');
const brandController = require('../Controllers/admin/brands');
const ordersController = require('../Controllers/admin/orderManagement');
const offerController = require('../Controllers/admin/offerManagement');
const couponContorller = require('../Controllers/admin/couponManagement');
const salesReportController = require('../Controllers/admin/salesReport');
// ==================
// 2. Route Definitions
// ==================

// --- Admin Authentication ---
router.get('/login', adminController.login);
router.post('/login', adminController.loginPost);
router.get('/logout', adminController.logout);


// ==================
// 3. Protected Routes (Requires Authentication)
// ==================

// Apply authentication middleware to protect the following routes
router.use(adminAuthMiddleware);

// --- Admin Dashboard ---
router.get('/dashboard', dashboardController.dashboard);

// --- User Management ---
router.get('/users', userController.userPage);
router.post('/users/:id/block', userController.userBlockUnblock);

// --- Category Management ---
router.get('/categories', categoryController.showCategory);
router.post('/addcategories', categoryController.createCategory);
router.post('/categories/:id/block', categoryController.BlockUnblock);
router.post('/categories/:id/edit', categoryController.edit);

// --- Brand Management ---
router.get('/brands', brandController.showBrands);
router.post('/add/brands',brandController.createBrand);
router.post('/brands/:id/edit', brandController.edit);
router.post('/brands/:id/block', brandController.BlockUnblock);

// --- Product Management ---
router.get('/products', productController.getAllProducts);
router.get('/addproduct', productController.getAddProduct);
router.post('/addproduct', uploads, productController.postAddProduct);
router.post('/products/:id/block', productController.BlockUnblock);
router.get('/updateproduct/:id', productController.getUpdateProduct);
router.post('/updateproduct/:id', uploads, productController.postEditProduct);

// --- Order Management ---
router.get('/order-management', ordersController.getOrders);
router.post('/update-order-status', ordersController.updateOrderStatus);
router.get('/get-return-details/:itemId', ordersController.getReturnDetails);
router.post('/accept-return', ordersController.acceptReturn);
router.post('/reject-return', ordersController.rejectReturn);
router.get('/get-order-details/:orderId', ordersController.getOrderDetails);

// --- Offer Management ---
router.get('/offer-management', offerController.getOffers);
router.post('/offer-management', offerController.addOffer);
router.put('/offer-management/:offerId', offerController.editOffer);
router.post('/offer/:offerId/block', offerController.blockUnblock);
router.delete('/offer-management/:offerId', offerController.deleteOffer);

// --- Coupon Management ---
router.get('/coupon-management', couponContorller.getCoupons);
router.post('/coupon-management', couponContorller.addCoupon);
router.patch('/coupon-management/:couponId', couponContorller.updateCoupon);
router.delete('/coupon-management/:couponId', couponContorller.deleteCoupon);

// --- Sales Report ---
router.get('/sales-report', salesReportController.getSalesReport);
router.post('/download-pdf', salesReportController.generatePDFReport);
router.post('/download-excel', salesReportController.generateExcelReport);

// ==================
// 4. Export Router
// ==================
module.exports = router;
