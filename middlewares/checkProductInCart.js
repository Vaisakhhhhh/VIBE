
const cartModel = require("../models/shoppingCart");

async function checkProductInCart(req, res, next) {
    try {
        const productId = req.params.productId;
        const userId = req.session.userId;

        if(!userId) {

            // User not authenticated
            res.locals.inCart = false;
            return next();
        }

        // Find the user's cart and check the product is in it 
        const cart = await cartModel.findOne({ user: userId });

        if(cart && cart.items.some(item => item.product.equals(productId))) {
            res.locals.inCart = true;
        } else {
            res.locals.inCart = false;
        }

        next();
    } catch (error) {
        console.log("Error checking product in cart : ", error);
        res.locals.inCart = false;
        next();
    }
}


module.exports = checkProductInCart;