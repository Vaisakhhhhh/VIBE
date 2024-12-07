//=============================
//   Admin Order Controller
//=============================


const orderModel = require('../../models/orderSchema');
const walletModel = require('../../models/walletSchema');


// --------------- Get Orders ------------------

exports.getOrders = async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    try {
        const offset = (page - 1) * limit;

        // const orders = await orderModel.find().populate('items.productId');
        const [orders, totalOrders] = await Promise.all([
            orderModel.find().populate('items.productId').sort({ createdAt: -1 }).skip(offset).limit(limit),
            orderModel.countDocuments()
        ]);

        const totalPages = Math.ceil(totalOrders / limit);
       
        orders.forEach(order => {
            const date = new Date(order.createdAt);
            order.formattedDate = date.toISOString().split('T')[0];
        });
      
       
        
        res.render('admin/orderManagement', { orders, currentPage: page, totalPages, limit});
    } catch (error) {
        console.log(error);
    }
}


// ----------------- Update Order Status -----------------------


exports.updateOrderStatus = async (req, res) => {
    const { itemId, newStatus } = req.body;
    
    try {
        // Find the order where the item exists
        const order = await orderModel.findOne({ 'items._id': itemId });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Find the item and check the current status
        const item = order.items.find(i => i._id.toString() === itemId);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Define the allowed status flow
        const statusFlow = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

        const currentStatusIndex = statusFlow.indexOf(item.status);
        const newStatusIndex = statusFlow.indexOf(newStatus);

        // Ensure that the new status follows the correct flow
        if (newStatusIndex < currentStatusIndex) {
            return res.status(400).json({ success: false, message: 'Cannot revert to a previous status' });
        }

        // Update the item status
        item.status = newStatus;
        item.statusUpdatedAt = Date.now();  // Update the status update time

        // Save the order with the new status
        await order.save();

        return res.status(200).json({ success: true, message: 'Order status updated successfully', itemId, newStatus });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// --------------------- Get Return Deatails -------------------------


exports.getReturnDetails = async (req, res) => {
    try {
        const { itemId } = req.params;

        const order = await orderModel.findOne({ 'items._id': itemId });

        const item = order.items.find(i => i._id.toString() === itemId);
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        res.json({
            productName: item.productName,
            reason: item.returnReason,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while fetching return details.' });
    }
}


// --------------------- Accept Return Request ---------------------

exports.acceptReturn = async (req, res) => {
    try {
        const { itemId } = req.body;
        const userId = req.session.userId;
        
        const order = await orderModel.findOne({ 'items._id': itemId }).populate('items.productId');

        const item = order.items.find(i => i._id.toString() === itemId);

        if (!item) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        item.productId.stock += item.quantity;
        await item.productId.save();

        item.status = 'Returned';
        await order.save();

       
            
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
                description: `Refund for returned order ${formatOrderId(order.id)}`
            };

            wallet.transactions.push(transaction);
            wallet.balance += (item.subtotal - couponAmount);

            await wallet.save();
        
        
        res.json({ message: 'Return accepted successfully.', itemId: item._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while accepting the return.' });
    }
}


// ---------------------- Reject Return Request ----------------------


exports.rejectReturn = async (req, res) => {
    try {
        const { itemId } = req.body;
        
        const order = await orderModel.findOne({ 'items._id': itemId });

        const item = order.items.find(i => i._id.toString() === itemId);

        if (!item) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        item.status = 'Retrun Request Rejected';
        await order.save();
        res.json({ message: 'Return rejected successfully.', itemId: item._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while rejecting the return.' });
    }
}


// ------------------- Get Order Details -------------------------

exports.getOrderDetails = async (req, res) => {
    
    try {
        const orderId = req.params.orderId;
        const order = await orderModel.findById(orderId).populate('items.productId');
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        const response = {
            orderId: order._id,
            date: order.createdAt.toISOString().split('T')[0],
            customerName: order.customer.customerName,
            customerEmail: order.customer.customerEmail,
            shippingAddress: `${order.customer.shippingAddress.address}, ${order.customer.shippingAddress.locality}, ${order.customer.shippingAddress.city}, ${order.customer.shippingAddress.state} - ${order.customer.shippingAddress.pincode}`,
            items: order.items.map(item => ({
                productName: item.productName,
                image: item.productId.images[0],
                quantity: item.quantity,
                finalAmount: item.finalAmount,
                status: item.status
            })),
            totalPrice: order.payment.totalAmount,
            discount: order.payment.totalDiscount,
            offer: order.payment.totalOffer,
            coupon: order.payment.couponDiscount,
            finalAmount: order.payment.finalAmount,
            paymentMethod: order.payment.paymentMethod,
            paymentStatus: order.payment.paymentStatus,
            phone: order.customer.shippingAddress.phone
        };
        res.json(response);
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}