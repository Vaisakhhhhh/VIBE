// ==================
// MongoDB Connection Setup
// ==================

const mongoose = require('mongoose'); // Import Mongoose
require('dotenv').config(); // Load environment variables from .env file

// Function to connect to MongoDB
const connectDB = async () => {
    try {
        // Attempt to connect to the MongoDB database using the connection string
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB is successfully connected'); // Log success message
    } catch (error) {
        // Log any connection errors
        console.log(`Error while connecting to MongoDB: ${error}`);
    }
};

// Export the connection function for use in other modules
module.exports = connectDB;
