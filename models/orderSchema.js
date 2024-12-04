const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
    customer: {
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
        customerName: { type: String, required: true },
        customerEmail: { type: String, required: true },
        shippingAddress: {
            name: { type: String, required: true },
            addressType: { type: String, required: true },
            address: { type: String, required: true },
            locality: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
            phone: { type: String, required: true },
        }
    },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            productName: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
            discount: { type: Number },
            offer: { type: Number },
            offerType: { type: String },
            finalAmount: { type: Number, required: true },
            subtotal: { type: Number, required: true },
            status: { type: String, default: 'Pending', 
                enum: ['Pending',  'Confirmed', 'Processing', 'Shipped','Out for Delivery', 'Delivered', 'Cancelled', 'Return Request Pending', 'Retrun Request Rejected', 'Returned']},
            statusUpdatedAt: { type: Date, default: Date.now },
            returnReason: { type: String },
        }
    ],
    payment: {
        paymentMethod: { type: String, required: true },
        paymentStatus: { type: String, default: 'Pending', enum: ['Pending', 'Completed', 'Failed', 'Refunded']},
        totalAmount: { type: Number, required: true },
        totalDiscount: { type: Number },
        totalOffer: { type: Number },
        couponDiscount: { type: Number },
        finalAmount: { type: Number, required: true },
        shippingCost: { type: Number },
    },
    
}, { timestamps: true });


module.exports = mongoose.model('Order', orderSchema);