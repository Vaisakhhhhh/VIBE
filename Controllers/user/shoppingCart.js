//==========================
// Cart Controller
//==========================


// Importing Schema
const cartModel = require("../../models/shoppingCart");
const productModel = require("../../models/productSchema");


// -------------- Get Cart ----------------


exports.getCart = async (req, res) => {

    try {
        const userId = req.session.userId;

        const cart = await cartModel.findOne({ user: userId }).populate("items.product");

        cart.items = cart.items.filter(item => !item.product.isBlocked );
        

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
    
        res.render("user/shoppingCart", { cart, totalPrice, totalDiscountPrice, discount, totalItems });
    } catch (error) {
        console.log("get cart error : ", error);
    }
 }
   


// ---------------- Add Product to Cart --------------

exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.userId;

        const product = await productModel.findOne({ _id: productId, isBlocked: false });
        if(!product || product.stock < quantity) {
            return res.status(400).json({ message: "Product not available or out of stock"});
        }
       
        let cart = await cartModel.findOne({ user: userId });
        if(!cart) {
           
            cart = new cartModel({ user: userId, items: []});
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if(itemIndex > -1) {
            return res.status(404).json({ message: 'Product is already in the cart'});
        }
     
            cart.items.push({ product: productId, quantity });
    

        await cart.save();

        res.status(200).json({ message: "Product added to the cart!"});


    } catch (error) {
        console.log("add to cart error :", error);
        res.status(500).json({ message: error.message});
    }
}


// --------------- Update Product Quantity in Cart -------------------


exports.updateCartQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.userId;

        if(quantity < 1 || quantity > 5) {
            return res.status(400).json({ message: 'Invalid quantity'});
        }

        const product = await productModel.findOne({ _id: productId, isBlocked: false });

        if(!product) {
            console.log("its working")
            return res.status(404).json({ message :'Sorry, Product is not availabe now!'});
        }

        if(product.stock < quantity) {
            return res.status(400).json({ message: `Only ${quantity - 1} quantity left in stock. Adjust your quantity to proceed.`});
        }

        // Find the user's cart and update the quantity of the specified product
        let cart = await cartModel.findOne({ user: userId });
        if(!cart) {
            return res.status(404).json({ message: 'Cart not found'});
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if(itemIndex === -1) {
            return res.status(404).json({ message: 'Product not found in cart'});
        }
        

        // Update the quantity
        cart.items[itemIndex].quantity = quantity;
        await cart.save();


        const UpdatedCart = await cartModel.findOne({ user: userId }).populate("items.product");

        UpdatedCart.items = UpdatedCart.items.filter(item => !item.product.isBlocked);

        let totalPrice = 0;
        let totalDiscountPrice = 0;
        let totalItems = 0;
        UpdatedCart.items.forEach(item => {
            const itemTotalPrice = item.product.price * item.quantity;
            const itemTotalDiscountPrice = item.product.discountPrice * item.quantity;

            totalPrice += itemTotalPrice;
            totalDiscountPrice += itemTotalDiscountPrice;
            totalItems++;
        });

        const discount = totalPrice - totalDiscountPrice;

      

        res.status(200).json({ message: `You updated the quantity of ${product.name}`, totalPrice, totalDiscountPrice, totalItems, discount, productId, quantity});
    } catch (error) {
        console.log('Error updating cart: ', error);
        res.status(500).json({ message: 'Oops! Something went wrong. Please try again later.'})
    }
}


// ---------------------- Remove Product from Cart -------------------------

exports.removeCartItem = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.userId;

        let cart = await cartModel.findOne({ user: userId });

        cart.items = cart.items.filter(item => item.product.toString() !== productId);

        await cart.save();

        const product = await productModel.findById(productId);

        res.status(200).json({ message: `${product.name} removed from cart!`})

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: `Oops! Something went wrong, Please try again later!`})
    }
}