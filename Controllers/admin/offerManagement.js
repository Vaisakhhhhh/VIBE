//==========================================
//         Admin Offer Controller    
//==========================================

const productModel = require('../../models/productSchema');
const categoryModel = require('../../models/categorySchema');
const offerModel = require('../../models/offerSchema');

// ------------- Get Offers ----------------

exports.getOffers = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const offset = (page - 1) * limit;

        const [ products, categories, offers, totalOffers ] = await Promise.all([
            productModel.find({ isBlocked: false }),
            categoryModel.find({ isBlocked: false }),
            offerModel.find().populate('applicableProduct').populate('applicableCategory')
            .sort({ createdAt: -1 }).skip(offset).limit(limit),
            offerModel.countDocuments()
        ]);
       
        const totalPages = Math.ceil(totalOffers / limit);
        res.render('admin/offers', { products, categories, offers, currentPage: page, totalPages, limit });

    } catch (error) {
        console.log(error);
    }
}


// ---------------- Add New Offer ------------------


exports.addOffer = async (req, res) => {
    try {

        const { title, discount, offerType, applicableProduct, applicableCategory, startDate, endDate, isActive } = req.body;
      
       
        const newOffer = new offerModel({
            title,
            discountPercentage: discount,
            offerType,
            applicableProduct: offerType === 'Product' ? applicableProduct : null,
            applicableCategory: offerType === 'Category' ? applicableCategory : null,
            startDate,
            endDate,
            isActive
        });

        await newOffer.save();

        res.status(201).json({ message: 'Offer added successfully!'});


    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error. Please try again later.'});
    }
}


// ---------------- Edit Offer --------------------


exports.editOffer = async (req, res) => {
    try {
        const { offerId } = req.params;

        const updatedData = {
            title: req.body.title,
            discountPercentage: req.body.discount,
            offerType: req.body.offerType,
            applicableProduct: req.body.offerType === 'Product' ? req.body.applicableProduct : null,
            applicableCategory: req.body.offerType === 'Category' ? req.body.applicableCategory : null,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            isActive: req.body.isActive,
        }

        await offerModel.findByIdAndUpdate( offerId, updatedData );
        res.status(200).json({ message: 'Offer updated successfully'});

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Oops! Something went wrong, Please try again later.'})
    }
}


// ---------------- Status Management ----------------------

exports.blockUnblock = async (req, res) => {
    try {
        const offerId = req.params.offerId;
        const { status } = req.body;

        await offerModel.findByIdAndUpdate(offerId, { isActive: status });
        res.status(200).json({ message: 'Offer status updated successfully'});
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to update offer status'});
    }
}


// ---------------- Delete Offer --------------------

exports.deleteOffer = async (req, res) => {
    try {
        const offerId = req.params.offerId;

        await offerModel.findByIdAndDelete(offerId);
        res.status(200).json({ message: 'offer deleted successfully'});
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to delete offer'});
    }
}