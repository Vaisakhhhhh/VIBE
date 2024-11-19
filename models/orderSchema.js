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
            discountPrice: { type: Number, required: true },
            subtotal: { type: Number, required: true },
            status: { type: String, default: 'Processing', enum: ['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']},
        }
    ],
    payment: {
        paymentMethod: { type: String, required: true },
        paymentStatus: { type: String, default: 'Pending', enum: ['Pending', 'Completed', 'Failed']},
        totalAmount: { type: Number, required: true },
        discount: { type: Number, required: true },
        discountPrice: { type: Number, required: true },
        shippingCost: { type: Number,},
    },
    
}, { timestamps: true });


module.exports = mongoose.model('Order', orderSchema);