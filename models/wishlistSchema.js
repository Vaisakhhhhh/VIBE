// Model for Wish List

const mongoose = require('mongoose');

const wishlistItemsSchema = mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: [wishlistItemsSchema]
}, { timestamps: true });


module.exports = mongoose.model('Wishlist', wishlistSchema);
