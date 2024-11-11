const mongoose = require(`mongoose`);


const productSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    discountPrice: {
        type: Number
    },
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `Brand`,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `Category`,
        required: true
    },
    images: [{
        type: String,
        required: true,
        
    }],
    isBlocked: {
        type: Boolean,
        default: false
    },
    warranty: {
        type: Number,
        required: true
    },
    model_name: {
        type: String,
        required: true
    },
    product_type: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    connectivity: {
        type: String,
        required: true
    }
    
    

}, {timestamps : true});


// Pre-save hook to calculate and set discountPrice
productSchema.pre('save', function(next) {
    if (this.discount > 0 && this.price) {
        this.discountPrice = Math.round(this.price - (this.price * this.discount) / 100);
    } else {
        this.discountPrice = this.price;
    }
    next();
});

module.exports = mongoose.model(`Product`, productSchema);