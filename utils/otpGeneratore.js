
// ==================
// OTP Generation Utility
// ==================

/**
 * Generates a random 6-digit OTP (One-Time Password).
 * @returns {number} A 6-digit OTP.
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
};

// Export the OTP generation function for use in other modules
module.exports = generateOtp;
