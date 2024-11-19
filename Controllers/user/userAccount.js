const { format } = require('date-fns');
const bcrypt = require(`bcrypt`);
const userModel = require("../../models/userSchema");
const addressModel = require("../../models/addressSchema");
const orderModel = require("../../models/orderSchema");

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
        })
        myOrders.reverse();
        console.log('my orders :', myOrders)
        res.render('user/myOrders', { myOrders });
    } catch (error) {
        console.log(error);
    }
}


exports.getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const confirmedOrder = await orderModel.findById(orderId).populate("items.productId");

        confirmedOrder.formattedDate = format(confirmedOrder.createdAt, 'MMMM dd, yyyy');

        res.render("user/orderDetails", { confirmedOrder });

    } catch (error) {
        console.log(error);
    }
}