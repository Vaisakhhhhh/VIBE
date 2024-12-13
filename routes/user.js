// ==================
// 1. Imports
// ==================
const express = require('express');
const router = express.Router();

// Controllers
const userController = require('../Controllers/user/userAuth');
const productController = require('../Controllers/user/productController');
const accountController = require('../Controllers/user/userAccount');
const cartController = require('../Controllers/user/shoppingCart');
const checkoutController = require('../Controllers/user/checkout');

// Middlewares
const loadCategoriesMiddleware = require('../middlewares/setCategoryInLocals');
const userAuthMiddleware = require('../middlewares/userAuthmiddleware');
const setUserInResponseLocals = require('../middlewares/setUserNameInLocals');
const checkProductInCart = require('../middlewares/checkProductInCart');

const isAuthenticated = userAuthMiddleware.isAuthenticated;

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
router.post('/logout', userController.logout);


router.use(userAuthMiddleware.isBocked);

// --- Landing Page Routes ---
router.get('/', userController.landingPage);

// --- Product view page ---
router.get('/product/:productId', checkProductInCart, productController.getProductDetails);

// --- All Products page ---
router.get('/all/products', productController.getAllProducts);
router.get('/all/products/filter', productController.getFilteredProducts);

// --- Category page ---
router.get('/category/:categoryId', productController.getSingleCategory);
router.get('/category/products/filter', productController.getFilteredProducts);

// --- Search ---
router.get('/search', productController.searchResult);





// ==================
// 4. Protected Routes (Requires Authentication)
// ==================


// --- User Profile ---
router.get('/user/profile', isAuthenticated, accountController.getUserProfile);
router.post('/user/update-profile',isAuthenticated, accountController.updateProfile);

// --- User Address ---
router.get('/user/address',isAuthenticated, accountController.getAddress); // get address
router.post('/user/address',isAuthenticated, accountController.addAddress); // add address
router.post('/user/address/:addressId',isAuthenticated, accountController.editAddress); // edit address
router.delete('/user/address/:addressId',isAuthenticated, accountController.deleteAddress); // delete address

// --- Change Password ---
router.get('/user/change-password',isAuthenticated, accountController.getChangePassword);
router.post('/user/change-password',isAuthenticated, accountController.updatePassword);

// --- Shopping Cart ---
router.get('/user/cart',isAuthenticated, cartController.getCart);
router.post('/user/add-to-cart',isAuthenticated, cartController.addToCart);
router.post('/user/update-cart-quantity',isAuthenticated, cartController.updateCartQuantity);
router.post('/user/remove-cart-item',isAuthenticated, cartController.removeCartItem);

// --- Checkout ---
router.get('/user/checkout',isAuthenticated, checkoutController.getCheckout);
router.post('/user/place-order',isAuthenticated, checkoutController.placeOrder);
router.get('/order-confirmation/:orderId',isAuthenticated, checkoutController.getConfirmation);
router.get('/user/get-coupons',isAuthenticated, checkoutController.getCoupons);
router.post('/apply-coupon',isAuthenticated, checkoutController.applyCoupon);
router.get('/remove-coupon',isAuthenticated, checkoutController.removeCoupon);
router.post('/user/verify-payment',isAuthenticated, checkoutController.verifyPayment);
router.post('/payment-failure',isAuthenticated, checkoutController.handlePaymentFailure);

// --- My Orders ---
router.get('/user/my-orders',isAuthenticated, accountController.getMyOrder);
router.get('/user/orders/:orderId',isAuthenticated, accountController.getOrderDetails);
router.post('/user/cancel-product',isAuthenticated, accountController.cancelProduct);
router.post('/user/request-return',isAuthenticated, accountController.requestReturn);
router.get('/download-invoice/:orderId',isAuthenticated, accountController.downloadInvoice);
router.get('/repayment/:orderId',isAuthenticated, accountController.repayment);

// --- My Coupons ---
router.get('/user/my-coupons',isAuthenticated, accountController.getCoupons);

// --- My Wallet ---
router.get('/user/my-wallet',isAuthenticated, accountController.getWallet);
router.get('/wallet/transactions',isAuthenticated, accountController.getTransactions);

// --- My Wishlist ---
router.post('/user/add-to-wishlist',isAuthenticated, accountController.addToWishlist);
router.get('/user/wishlist',isAuthenticated, accountController.getWishlist);
router.post('/user/remove-wishlist-item',isAuthenticated, accountController.removeWishlistItems);



// ==================
// 5. Export Router
// ==================
module.exports = router;
