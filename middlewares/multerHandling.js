// ==================
// Multer Setup for File Uploads
// ==================

const multer = require('multer');

// Configure storage settings
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Directory to save uploaded images
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Create unique file name using timestamp
    }
});

// Initialize multer with specified storage settings
const uploads = multer({ storage: storage });

module.exports = uploads.array('newImages', 10); // Allows up to 10 files with 'newImages' as the field name
