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


// --- Admin Dashboard ---
router.get('/dashboard',adminAuthMiddleware, dashboardController.dashboard);

// --- User Management ---
router.get('/users',adminAuthMiddleware, userController.userPage);
router.post('/users/:id/block',adminAuthMiddleware, userController.userBlockUnblock);

// --- Category Management ---
router.get('/categories',adminAuthMiddleware, categoryController.showCategory);
router.post('/addcategories',adminAuthMiddleware, categoryController.createCategory);
router.post('/categories/:id/block',adminAuthMiddleware, categoryController.BlockUnblock);
router.post('/categories/:id/edit',adminAuthMiddleware, categoryController.edit);

// --- Brand Management ---
router.get('/brands',adminAuthMiddleware, brandController.showBrands);
router.post('/add/brands',adminAuthMiddleware, brandController.createBrand);
router.post('/brands/:id/edit',adminAuthMiddleware, brandController.edit);
router.post('/brands/:id/block',adminAuthMiddleware, brandController.BlockUnblock);

// --- Product Management ---
router.get('/products',adminAuthMiddleware, productController.getAllProducts);
router.get('/addproduct',adminAuthMiddleware, productController.getAddProduct);
router.post('/addproduct',adminAuthMiddleware, uploads, productController.postAddProduct);
router.post('/products/:id/block',adminAuthMiddleware, productController.BlockUnblock);
router.get('/updateproduct/:id',adminAuthMiddleware, productController.getUpdateProduct);
router.post('/updateproduct/:id',adminAuthMiddleware, uploads, productController.postEditProduct);

// --- Order Management ---
router.get('/order-management',adminAuthMiddleware, ordersController.getOrders);
router.post('/update-order-status',adminAuthMiddleware, ordersController.updateOrderStatus);
router.get('/get-return-details/:itemId',adminAuthMiddleware, ordersController.getReturnDetails);
router.post('/accept-return',adminAuthMiddleware, ordersController.acceptReturn);
router.post('/reject-return',adminAuthMiddleware, ordersController.rejectReturn);
router.get('/get-order-details/:orderId',adminAuthMiddleware, ordersController.getOrderDetails);

// --- Offer Management ---
router.get('/offer-management',adminAuthMiddleware, offerController.getOffers);
router.post('/offer-management',adminAuthMiddleware, offerController.addOffer);
router.put('/offer-management/:offerId',adminAuthMiddleware, offerController.editOffer);
router.post('/offer/:offerId/block',adminAuthMiddleware, offerController.blockUnblock);
router.delete('/offer-management/:offerId',adminAuthMiddleware, offerController.deleteOffer);

// --- Coupon Management ---
router.get('/coupon-management',adminAuthMiddleware, couponContorller.getCoupons);
router.post('/coupon-management',adminAuthMiddleware, couponContorller.addCoupon);
router.patch('/coupon-management/:couponId',adminAuthMiddleware, couponContorller.updateCoupon);
router.delete('/coupon-management/:couponId',adminAuthMiddleware, couponContorller.deleteCoupon);

// --- Sales Report ---
router.get('/sales-report',adminAuthMiddleware, salesReportController.getSalesReport);
router.post('/download-pdf',adminAuthMiddleware, salesReportController.generatePDFReport);
router.post('/download-excel',adminAuthMiddleware, salesReportController.generateExcelReport);

// ==================
// 4. Export Router
// ==================
module.exports = router;
