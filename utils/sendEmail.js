// ==================
// Email Utility for Sending OTP
// ==================

const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables

// Create a transporter for sending emails using Gmail
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Email user from environment variables
        pass: process.env.EMAIL_PASS  // Email password from environment variables
    }
});

/**
 * Sends an OTP via email.
 * @param {string} email - The recipient's email address.
 * @param {number} otp - The OTP to be sent.
 * @returns {Promise} - A promise that resolves when the email is sent.
 */
const sendOtpEmail = (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender's email
        to: email, // Recipient's email
        subject: 'Your OTP for Signup', // Email subject
        text: `Your OTP for signup is ${otp}. It is valid for 2 minutes.` // Email body
    };

    // Send the email and return the promise
    return transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error occurred:', error); // Log any errors
        } else {
            console.log('OTP Email sent successfully:', info.response); // Log success message
        }
    });
};

// Export the sendOtpEmail function for use in other modules
module.exports = sendOtpEmail;
