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
const offerModel = require('../../models/offerSchema');


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

        if(item.offers.length > 0) {
            const productOffer = item.offers.find(offer => offer.offerType === 'Product');
            const categoryOffer = item.offers.find(offer => offer.offerType === 'Category');
            
            const discount = productOffer ? productOffer.discountPercentage : categoryOffer.discountPercentage;
            const offerAmount = Math.round((item.product.price * discount) / 100);
            item.product.offer = offerAmount;
            item.product.offerType = productOffer ? `${productOffer.discountPercentage}% Product offer Applied` : `${categoryOffer.discountPercentage}% Category offer Applied`;
            totalOfferAmount += offerAmount * item.quantity;
            
        }
        
       });

       return { cartItems, totalOfferAmount }
}


// -------------- Get Checkout ----------------


exports.getCheckout = async (req, res) => {

    try {
        const userId = req.session.userId;

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
    
        res.render("user/checkout", { addresses, cartItems, totalPrice, totalDiscountPrice, discount, totalItems, totalOfferAmount });
    } catch (error) {
        console.log("get cart error : ", error);
    }
 }
   


// --------------- Place Order -----------------

exports.placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod } = req.body;
        const userId = req.session.userId;

        const  [ user, shippingAddress ]  = await Promise.all([
            userModel.findById(userId),
            addressModel.findById(addressId)
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
                finalAmount,
                shippingCost: orderItems.length * 40
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