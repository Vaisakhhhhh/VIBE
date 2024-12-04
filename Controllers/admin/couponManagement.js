//=============================
//    Admin Coupon Controller
//=============================

const couponModel = require('../../models/couponSchema');


// ---------- Get All Coupons ----------

exports.getCoupons = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const offset = (page - 1) * limit;

        const [ coupons, totalCoupons ] = await Promise.all([
            couponModel.find().sort({ createdAt: -1 }).skip(offset).limit(limit),
            couponModel.countDocuments()
        ]);

        const totalPages = Math.ceil(totalCoupons / limit);
        res.render('admin/coupons', { coupons, currentPage: page, totalPages, limit });
    } catch (error) {
        console.log(error);
    }
}


// ------------ Add a New Coupon ---------------

exports.addCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        
        const existingCoupon = await couponModel.findOne({ couponCode: { $regex: `^${couponCode}$`, $options: 'i' } });
        if(existingCoupon) {
            return res.status(409).json({ message: 'The coupon code already exists.'});
        }

        const couponData = req.body;
        
        await couponModel.create(couponData);
        res.status(201).json({ message: 'Coupon created successfully!'});

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Oops! Something went wrong, Please try again later'});
    }
}


// --------------- Update Coupon -----------------

exports.updateCoupon = async (req, res) => {
    try {
        const couponId = req.params.couponId;
        const updatedCoupon = req.body;
    
        await couponModel.findByIdAndUpdate(couponId, updatedCoupon);
        res.status(200).json({ message: 'Coupon updated successfully'});
        
       
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Oops! Something went wrong! Please try again later'});
    }
}


// -------------- Delete Coupon -----------------

exports.deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.couponId;

        await couponModel.findByIdAndDelete(couponId);
        res.status(200).json({ message: 'Coupon deleted successfully'});
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Oops! Something went wrong, Please try again later'});
    }
}