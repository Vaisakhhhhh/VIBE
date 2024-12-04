const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: { type: String, required: true, unique: true },
    discountType: { type: String, enum: [ 'Percentage', 'Fixed' ], required: true },
    discountValue: { type: Number, required: true },
    minimumOrderValue: { type: Number, required: true },
    startDate: {type: Date, required: true },
    expiryDate: { type: Date, required: true },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref:'user'}],

}, { timestamps: true });


module.exports = mongoose.model('Coupon', couponSchema);