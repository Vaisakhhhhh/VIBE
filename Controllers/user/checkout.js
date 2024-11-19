//==========================
// Cart Controller
//==========================

const { format } = require('date-fns');

// Importing Schema
const cartModel = require("../../models/shoppingCart");
const addressModel = require("../../models/addressSchema");
const userModel = require("../../models/userSchema");
const orderModel = require("../../models/orderSchema");
const productModel = require("../../models/productSchema");


// -------------- Get Checkout ----------------


exports.getCheckout = async (req, res) => {

    try {
        const userId = req.session.userId;

        const addresses = await addressModel.find({ userId: userId });

        const cart = await cartModel.findOne({ user: userId }).populate("items.product");

        cart.items = cart.items.filter(item => !item.product.isBlocked );
        

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
    
        res.render("user/checkout", { addresses, cart, totalPrice, totalDiscountPrice, discount, totalItems });
    } catch (error) {
        console.log("get cart error : ", error);
    }
 }
   


// --------------- Place Order -----------------

exports.placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod } = req.body;
        const userId = req.session.userId;

        const user = await userModel.findById(userId);

        const shippingAddress = await addressModel.findById(addressId);
        if(!shippingAddress) {
            return res.status(404).json({ message: "Address not found" });
        }

        const cart = await cartModel.findOne({ user: userId});
        const items = cart.items.filter(item => !item.product.isBlocked);

        let totalAmount = 0;
        let discountPrice = 0;

        // Validate product availability and calculate subtotal

        const orderItems = await Promise.all(items.map(async (item) => {
            const product = await productModel.findById(item.product);

            // Check stock availability
            if(product.stock < item.quantity) {
                throw new Error(`Insufficient stock for product ${product.name}. Only ${product.stock} items left.`);
            }

            // Calculate subtotal for the item
            const subtotal = product.discountPrice * item.quantity;
            discountPrice += subtotal;
            const originalPrice = product.price * item.quantity;
            totalAmount += originalPrice;

            // Return the order item
            return {
                productId: product._id,
                productName: product.name,
                quantity: item.quantity,
                price: product.price,
                discountPrice: product.discountPrice,
                subtotal,
                status: 'Processing'
            };

        }));

        const discount = totalAmount - discountPrice;

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
                discount,
                discountPrice
            },
            
        });


        // Save the order
        const savedOrder = await order.save();

       // Update product stock
       await Promise.all(orderItems.map(async (item) => {
            await productModel.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
       }));

       // After confirmed the order remove products from cart
       cart.items = [];
       await cart.save();
       
       res.status(201).json({ orderId : savedOrder._id });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message || 'Failde to place order'});
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