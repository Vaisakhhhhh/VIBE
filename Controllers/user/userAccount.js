const { format } = require('date-fns');
const bcrypt = require(`bcrypt`);
const userModel = require("../../models/userSchema");
const addressModel = require("../../models/addressSchema");
const orderModel = require("../../models/orderSchema");
const couponModel = require('../../models/couponSchema');
const walletModel = require('../../models/walletSchema');

//---------------------- Get User Profile ----------------------

exports.getUserProfile = (req, res) => {

    try {

        res.render('user/profile');
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
    
}


//-------------------- Update Profile ------------------


exports.updateProfile = async (req, res) => {
    try {
        const { name, mobileNumber } = req.body;
        const userId = req.session.userId;

        await userModel.findByIdAndUpdate(userId, {name, mobileNumber});
        const user = await userModel.findById(userId);
      
        const firstName = user.name.split(' ')[0];
        req.session.userName = { name: firstName };

        res.status(200).json({message: 'Profile updated successfully'});
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}


//-------------------- Get Address ----------------------


exports.getAddress = async (req, res) => {
    try {
        const userId = req.session.userId;

        const addresses = await addressModel.find({userId: userId});

        res.render("user/address", { addresses });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal server error");
    }
}


//------------------ Add Address ----------------------

exports.addAddress = async (req, res) => {
    try {
        
        const addressData = req.body;
        addressData.userId = req.session.userId;
        const address = new addressModel({...addressData});
      
        await address.save();
        res.status(201).json({message: 'Address added successfully'});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: 'Error adding address'});
    }
}


//-------------------- Edit Address --------------------

exports.editAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { addressId } = req.params;
        const updatedAddress = req.body;

        console.log('userId :', userId, 'addressId :', addressId)

        const address = await addressModel.findOneAndUpdate(
            { userId, _id: addressId},
            updatedAddress,
            { new: true, runValidators: true}
        );


        if(!address) {
            return res.status(404).json({message: 'Address not found'});
        }

        // Successfully updated
        res.status(200).json({ message: 'Address updated successfully'});


    } catch (error) {
        console.log('Error updating address :', error);
        res.status(500).json({ message: 'Server error while updating address'});
    }
}


//--------------------- Delete Address --------------------

exports.deleteAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { addressId } = req.params;

        const address = await addressModel.findOneAndDelete({ userId, _id: addressId });

        if(!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        res.status(200).json({ message: 'Address deleted successfully'});
    } catch (error) {
        console.log('Error deleting address :', error);
        res.status(500).json({ message: 'Server error while deleting address'});
    }
}




//---------------------- Get Change Password -------------------

exports.getChangePassword = (req, res) => {
    
     res.render("user/changePassword");
}


//---------------------- Update Password -----------------------

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.userId;

        // Fetch the user data
        const user = await userModel.findById(userId);

        if(!user) {
            return res.status(404).json({ message: 'User not found.'});
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if(!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect."});
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully'});

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Oops! Something went wrong. Please try again later."})
    }
}


// ------------------- My Orders -------------------

exports.getMyOrder = async (req, res) => {
    try {
        const userId = req.session.userId;

        const myOrders = await orderModel.find({'customer.customerId': userId }).populate("items.productId");

        myOrders.forEach(order => {
            order.formattedDate = format(order.createdAt, 'MMMM dd, yyyy');
            order.items.forEach(item => {
                item.statusDateUpdate = format(item.statusUpdatedAt, 'MMMM dd, yyyy');
            })
        })
        myOrders.reverse();
      
        res.render('user/myOrders', { myOrders });
    } catch (error) {
        console.log(error);
    }
}


// -------------------- Get Order Detailts ---------------------

exports.getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const confirmedOrder = await orderModel.findById(orderId).populate("items.productId");

        confirmedOrder.formattedDate = format(confirmedOrder.createdAt, 'MMMM dd, yyyy');

        const totalItems = confirmedOrder.items.length;

        res.render("user/orderDetails", { confirmedOrder, totalItems });

    } catch (error) {
        console.log(error);
    }
}


// -------------------- Cancel Product -----------------------

exports.cancelProduct = async (req, res) => {
    try {
        const { itemId } = req.body;
        const userId = req.session.userId;

        const order = await orderModel.findOne({ 'items._id': itemId }).populate('items.productId');

        if(!order) {
            return res.status(404).json({ message: 'order not found'})
        }

         // Find the item and check the current status
         const item = order.items.find(i => i._id.toString() === itemId);

         if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

          // Prevent cancellation if already delivered or canceled
          if (['Delivered', 'Cancelled'].includes(item.status)) {
            return res.status(400).json({ success: false, message: 'Product cannot be canceled' });
        }

        item.status = 'Cancelled';
        item.statusUpdatedAt = Date.now();
        item.productId.stock += item.quantity;
        await item.productId.save();
        
        await order.save();
        const cancelledDate = format(Date.now(), 'MMMM dd, yyyy');

        if((order.payment.paymentMethod === 'Razorpay' || order.payment.paymentMethod === 'Wallet') && order.payment.paymentStatus === 'Completed') {
            
            let wallet = await walletModel.findOne({ userId });
            if(!wallet) {
                wallet = new walletModel({
                    userId,
                    balance: 0,
                    transactions: []
                });
            }

            const couponAmount = order.payment.couponDiscount ? Math.round(order.payment.couponDiscount / order.items.length) : 0;
            const formatOrderId = (orderId) => {
                const halfLength = Math.ceil(orderId.length / 2); 
                return `#ORD-${orderId.slice(0, halfLength)}..`; 
              };

            const transaction = {
                orderId: order.id,
                type: 'Credit',
                amount: item.subtotal - couponAmount,
                description: `Refund for canceled order ${formatOrderId(order.id)}`
            };

            wallet.transactions.push(transaction);
            wallet.balance += (item.subtotal - couponAmount);

            await wallet.save();
        }

        res.status(200).json({ message: 'Order canceled successfully', cancelledDate});

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Oops! some thing went wrong, Please try again later!'})
    }
}

// ----------------- Sent Return Request ----------------------

exports.requestReturn = async (req, res) => {
    try {
        const { itemId, reason } = req.body;

        const order = await orderModel.findOne({ 'items._id' : itemId});
        
        if(!order) {
            return res.status(404).json({ success: false, message: 'Item not found'});
        }

        const item = order.items.find(item => item._id.toString() === itemId);

        item.status = 'Return Request Pending';
        item.returnReason = reason;
        item.statusUpdatedAt = Date.now();

        await order.save();

        const returnRequestedDate = format(Date.now(), 'MMMM dd, yyyy');

        res.status(200).json({ success: true, message: 'Return request submitted', returnRequestedDate });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Oops! Some thing went wrong, Please try again later'});
    }
}


// ---------------- Get Coupons -----------------

exports.getCoupons = async (req, res) => {
    try {
        const currentDate = Date.now();
        const userId = req.session.userId;

        const [ availableCoupons, upcomingCoupons, usedCoupons ] = await Promise.all([
            couponModel.find({
                startDate: { $lt: currentDate },
                expiryDate: { $gte: currentDate },
                usedBy: { $ne: userId }
            }).sort({ createdAt: -1 }),

            couponModel.find({
                startDate: { $gt: currentDate }
            }).sort({ startDate: 1 }),

            couponModel.find({
                usedBy: userId
            }).sort({ createdAt: -1 })
        ]);

        availableCoupons.forEach(coupon => {
            coupon.formattedDate = formatCouponDate(coupon.expiryDate);
        });

        upcomingCoupons.forEach(coupon => {
            coupon.formattedDate = formatCouponDate(coupon.expiryDate);
        });

        usedCoupons.forEach(coupon => {
            coupon.formattedDate = formatCouponDate(coupon.expiryDate);
        });
        
        res.render('user/myCoupons', { availableCoupons, upcomingCoupons, usedCoupons });
    } catch (error) {
        console.log(error);
    }
}



function formatCouponDate(dateString) {
    const date = new Date(dateString);

    // Day, month, and year
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear(); 

    return { day, month, year };
}


// ------------ Get Wallet ------------

exports.getWallet = async (req, res) => {
    try {
        const userId = req.session.userId;

        const wallet = await walletModel.findOne({ userId });
        res.render('user/wallet', { wallet });
    } catch (error) {
        console.log(error);
    }
}


// ----------- Wallet Transactions ------------

exports.getTransactions = async (req, res) => {
    try {
        const userId = req.session.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;

        const wallet = await walletModel.findOne({ userId });

        if(!wallet) {
            return res.status(404).json({ message: 'Wallet not found'});
        }

        const transactions = wallet.transactions
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice((page -1) * limit, page * limit);

        const totalTransactions = wallet.transactions.length;

        res.json({
            transactions,
            totalTransactions,
            currentPage: page,
            totalPages: Math.ceil(totalTransactions / limit),
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error fetching transactions', error: error.message});
    }
}