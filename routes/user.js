// ==================
// 1. Imports
// ==================
const express = require('express');
const router = express.Router();

// Controllers
const userController = require('../Controllers/user/userAuth');
const productController = require('../Controllers/user/productController');
const accountController = require('../Controllers/user/userAccount');

// Middlewares
const loadCategoriesMiddleware = require('../middlewares/setCategoryInLocals');
const userAuthMiddleware = require('../middlewares/userAuthmiddleware');
const setUserInResponseLocals = require('../middlewares/setUserNameInLocals');

// ==================
// 2. Middleware Setup
// ==================

// Load categories for views and set user data in response locals
router.use(loadCategoriesMiddleware);
router.use(setUserInResponseLocals);

// ==================
// 3. Public Routes
// ==================

// --- User Registration and Login ---
router.get('/signup', userController.signup);
router.post('/signup', userController.signupPost);

router.get('/verify-otp', userController.verifyOtp); // get otp
router.post('/verify-otp', userController.verifyOtpPost); // verify otp and create account
router.post('/resend-otp', userController.resendOtp); // resend otp

router.get('/login', userController.login);
router.post('/login', userController.loginPost);
router.get('/logout', userController.logout);

// --- Landing Page Routes ---
router.get('/', userController.landingPage);

// --- Product view page ---
router.get('/product/:id', productController.getProductDetails);

// --- All Products page ---
router.get('/all/products', productController.getAllProducts);
router.get('/all/products/filter', productController.getFilteredProducts);

// --- Category page ---
router.get('/category/:id', productController.getSingleCategory);
router.get('/category/products/filter', productController.getFilteredProducts);

// ==================
// 4. Protected Routes (Requires Authentication)
// ==================

// Apply authentication middleware to protect the following routes
router.use(userAuthMiddleware);

// --- Home and Product Details ---
router.get('/home', userController.homePage);

// --- Product view page ---
router.get('/user/product/:id', productController.getProductDetails);

// --- All Products page ---
router.get('/user/all/products', productController.getAllProducts);

// --- Category page ---
router.get('/user/category/:id', productController.getSingleCategory);

// --- User Profile ---
router.get('/user/profile', accountController.getUserProfile);
router.post('/user/update-profile', accountController.updateProfile);

// --- User Address ---
router.get('/user/address', accountController.getAddress); // get address
router.post('/user/address', accountController.addAddress); // add address
router.post('/user/address/:addressId', accountController.editAddress); // edit address
router.delete('/user/address/:addressId', accountController.deleteAddress); // delete address

// --- Change Password ---
router.get('/user/change-password', accountController.getChangePassword);
router.post('/user/change-password', accountController.updatePassword);


// ==================
// 5. Export Router
// ==================
module.exports = router;
