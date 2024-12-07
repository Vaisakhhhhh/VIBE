const mongoose = require('mongoose');

// Transaction Sub-Schema
const transactionSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Credit', 'Debit'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});


// Wallet Schema
const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    transactions: {
        type: [transactionSchema],
        default: []
    }
});

module.exports = mongoose.model("Wallet", walletSchema);