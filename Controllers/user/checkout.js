//==========================
// Cart Controller
//==========================

const { format } = require('date-fns');
const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET
});

// Importing Schema
const cartModel = require("../../models/shoppingCart");
const addressModel = require("../../models/addressSchema");
const userModel = require("../../models/userSchema");
const orderModel = require("../../models/orderSchema");
const productModel = require("../../models/productSchema");
const offerModel = require('../../models/offerSchema');
const couponModel = require('../../models/couponSchema');


// ------------- Function for find the offer Amount --------------

async function findOffer(cart) {
    const currentDate = Date.now();
        const cartItems = await Promise.all(
            cart?.items.map(async (item) => {
                const categoryId = item.product.category.toString();
                const offers = await offerModel.find({
                    $and: [
                        { isActive: true },
                        { startDate: { $lte: currentDate } },
                        { endDate: { $gte: currentDate } },
                        {
                            $or: [
                                { applicableProduct: item.product.id },
                                { applicableCategory: categoryId }
                            ]
                        }
                    ]
                });
                
                return { ...item.toObject(), offers }; // Attach offers to the item
            })
        );
        
       let totalOfferAmount = 0;

       cartItems.forEach(item => {

        if(item.offers.length > 0 && item.product.discount <= 50 ) {
            const productOffer = item.offers.find(offer => offer.offerType === 'Product');
            const categoryOffer = item.offers.find(offer => offer.offerType === 'Category');
            
            const discount = productOffer ? productOffer.discountPercentage : categoryOffer.discountPercentage;
            const offerAmount = Math.round((item.product.price * discount) / 100);
            item.product.offer = offerAmount;
            item.product.offerType = productOffer ? `${productOffer.discountPercentage}% Product offer Applied` : `${categoryOffer.discountPercentage}% Category offer Applied`;
            totalOfferAmount += offerAmount * item.quantity;
            
        } else {
            item.offers = [];
        }
        
       });

       return { cartItems, totalOfferAmount }
}


// -------------- Get Checkout ----------------


exports.getCheckout = async (req, res) => {

    try {
        const userId = req.session.userId;
        req.session.isCouponApplied = null;
        const addresses = await addressModel.find({ userId: userId });

        const cart = await cartModel.findOne({ user: userId }).populate("items.product");

        cart.items = cart.items.filter(item => !item.product.isBlocked );
        
        const { cartItems, totalOfferAmount } = await findOffer(cart);

        let totalPrice = 0;
        let totalDiscountPrice = 0;
        let totalItems = 0;
        cart?.items.forEach(item => {
            const itemTotalPrice = item.product.price * item.quantity;
            const itemTotalDiscountPrice = item.product.discountPrice * item.quantity;

            totalPrice += itemTotalPrice;
            totalDiscountPrice += itemTotalDiscountPrice;
            totalItems++;
        });

        const discount = totalPrice - totalDiscountPrice;
        totalDiscountPrice = totalDiscountPrice - totalOfferAmount;
        req.session.orderData = {
            discount,
            totalItems,
            totalOfferAmount,
            totalDiscountPrice
        }
    
        res.render("user/checkout", { addresses, cartItems, totalPrice, totalDiscountPrice, discount, totalItems, totalOfferAmount });
    } catch (error) {
        console.log("get cart error : ", error);
    }
 }


 // -------------- Get Available Coupons ----------------

 exports.getCoupons = async (req, res) => {
    try {
        const userId = req.session.userId;
        const currentDate = Date.now();
        const coupons = await couponModel.find({
            startDate: { $lte: currentDate },
            expiryDate: { $gte: currentDate },
            usedBy: { $ne: userId }
        }).sort({ createdAt: -1 });

       
        if(coupons.length === 0) {
            
            return res.status(404).json({ message: 'No coupons available at the moment.'})
        }

        res.status(200).json({ coupons });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Oops! Something went wrong, Please try again later'});
    }
 }
   

 // --------------- Apply Coupon ----------------

 exports.applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const { discount, totalItems, totalOfferAmount, totalDiscountPrice } = req.session.orderData;
        const userId = req.session.userId;
        const orderValue = totalDiscountPrice;

        const coupon = await couponModel.findOne({ couponCode });

        if(!coupon) {
            return res.status(400).json({ message: 'Invalid coupon code.'});
        }

        const currentDate = new Date();
        if(currentDate < coupon.startDate) {
            return res.status(400).json({ message: 'This coupon is not active.'});
        }

        if(currentDate > coupon.expiryDate) {
            return res.status(400).json({ message: 'This coupon has expired.'});
        }

        if(orderValue < coupon.minimumOrderValue) {
            
            return res.status(400).json({ message: `Minimum order value for this coupon is ₹${coupon.minimumOrderValue}.`})
        }

        if(coupon.usedBy.includes(userId)) {
            return res.status(400).json({ message: 'You have already used this coupon.'});
        }

      
        const couponDiscount = coupon.discountType === 'Percentage'
                       ? Math.round((orderValue * coupon.discountValue) / 100)
                       : coupon.discountValue;

       
        const finalAmount = totalDiscountPrice - couponDiscount;
        const totalDiscount = discount + totalOfferAmount + couponDiscount + ( totalItems * 40 );

        req.session.isCouponApplied = couponCode;

        res.status(200).json({ message: 'Coupon applied successfully.', couponDiscount, finalAmount, totalDiscount });
        

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Oops! Something went wrong, Please try again later.'});
    }
 }


 // -------------- Remove Coupon ---------------

 exports.removeCoupon = (req, res) => {

    if(!req.session.isCouponApplied) {
        return res.status(400).json({ message: 'No coupon applied'});
    }
    
    req.session.isCouponApplied = null;
    const { discount, totalItems, totalOfferAmount, totalDiscountPrice } = req.session.orderData;
    const totalDiscount = discount + totalOfferAmount + ( totalItems * 40 );
    res.status(200).json({ message: 'Coupon removed successfully', finalAmount: totalDiscountPrice, totalDiscount });
 }


// --------------- Place Order -----------------

exports.placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod } = req.body;
        const userId = req.session.userId;

        const  [ user, shippingAddress, coupon ]  = await Promise.all([
            userModel.findById(userId),
            addressModel.findById(addressId),
            couponModel.findOne({ couponCode : req.session.isCouponApplied })
        ]); 
      
       
        if(!shippingAddress) {
            return res.status(404).json({ message: "Address not found" });
        }


        const cart = await cartModel.findOne({ user: userId}).populate('items.product');
        cart.items = cart.items.filter(item => !item.product.isBlocked);

        const { cartItems, totalOfferAmount } = await findOffer(cart);
        
    
        let totalAmount = 0;
        let finalAmount = 0;
        let totalDiscount = 0;

        // Validate product availability and calculate subtotal

        const orderItems = cartItems.map( (item) => {
           
            // Check stock availability
            if(item.product.stock < item.quantity) {
                throw new Error(`Insufficient stock for product ${item.product.name}. Only ${item.product.stock} items left.`);
            }

            // Calculate subtotal for the item
            const subtotal = (item.product.discountPrice -( item.product.offer || 0)) * item.quantity;
            finalAmount += subtotal;
            const originalPrice = item.product.price * item.quantity;
            totalAmount += originalPrice;
            const finalDiscount = (item.product.price - item.product.discountPrice) * item.quantity;
            totalDiscount += finalDiscount;

            // Return the order item
            return {
                productId: item.product._id,
                productName: item.product.name,
                quantity: item.quantity,
                price: item.product.price,
                discount: item.product.price - item.product.discountPrice,
                offer: item.product.offer || 0,
                offerType: item.product.offerType || '',
                finalAmount: item.product.discountPrice - (item.product.offer || 0),
                subtotal,
                status: 'Pending'
            };

        });

        const couponDiscount = coupon?.discountType === 'Percentage'
                             ? Math.round((finalAmount * coupon?.discountValue) / 100)
                             : coupon?.discountValue   


        
        const order = new orderModel({
            customer: {
                customerId: userId,
                customerName: user.name,
                customerEmail: user.email,
                shippingAddress: {
                    name: shippingAddress.name,
                    addressType: shippingAddress.addressType,
                    address: shippingAddress.address,
                    locality: shippingAddress.locality,
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    pincode: shippingAddress.pincode,
                    phone: shippingAddress.mobileNumber
                }
            },
            items: orderItems,
            payment: {
                paymentMethod,
                paymentStatus: 'Pending',
                totalAmount,
                totalDiscount,
                totalOffer: totalOfferAmount,
                couponDiscount: couponDiscount || 0,
                finalAmount : finalAmount - ( couponDiscount || 0 ),
                shippingCost: orderItems.length * 40
            },
            
        });

        // Save the order
        const savedOrder = await order.save();

        req.session.isCouponApplied = null;
        
        if(coupon) {
            coupon?.usedBy.push(userId);
            await coupon.save();
        }

       // Update product stock
       await Promise.all(orderItems.map(async (item) => {
            await productModel.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
       }));

       // After confirmed the order remove products from cart
       cart.items = [];
       await cart.save();


       
       
       if (paymentMethod === 'Razorpay') {

        const razorpayOrder = await razorpay.orders.create({
            amount: (finalAmount - ( couponDiscount || 0 )) * 100, // Amount in paise
            currency: 'INR',
            receipt: savedOrder._id.toString(),
        });

        return res.status(200).json({ 
            razorpayOrderId: razorpayOrder.id, 
            orderId: savedOrder._id,
            amount: razorpayOrder.amount,
            keyId: process.env.KEY_ID
        });
    } else {
        res.status(201).json({ orderId: savedOrder._id });
    }

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message || 'Failde to place order'});
    }
}


// --------------- Verify Razorpay Payment ----------------

exports.verifyPayment = async (req, res) => {
    try {
        const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', process.env.KEY_SECRET);
        hmac.update(razorpayOrderId + '|' + razorpayPaymentId);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === razorpaySignature) {
            
            await orderModel.findByIdAndUpdate( orderId, {
                'payment.paymentStatus': 'Completed'
            });

            res.status(200).json({ message: 'Payment verified successfully', orderId });
        } else {
            res.status(400).json({ message: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Payment verification failed' });
    }
};


// -------------- Handle Payment Failure ----------------

exports.handlePaymentFailure = async (req, res) => {
    try {
        const { orderId } = req.body;
 
        await orderModel.findByIdAndUpdate( orderId, {
            'payment.paymentStatus': 'Failed',
            'items.$[].status': 'Order not Confirmed'
        });
        res.status(200).json({ orderId });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'server error in payment filed'});
    }
} 



// ---------------- Get Confirmation ------------------

exports.getConfirmation = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const confirmedOrder = await orderModel.findById(orderId).populate('items.productId');

         // Format the creation date for order
        
            confirmedOrder.formattedDate = format(confirmedOrder.createdAt, 'MMMM dd, yyyy');
       
       
        res.render('user/orderConfirmation', { confirmedOrder });

    } catch (error) {
        console.log(error);
    }
    
}