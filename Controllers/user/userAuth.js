
//=======================
// User Controller
//======================

const bcrypt = require(`bcrypt`);
const otpSchema = require(`../../models/otpSchema`);
const userSchema = require(`../../models/userSchema`);
const generateOtp = require(`../../utils/otpGeneratore`);
const sendOtpEmail = require(`../../utils/sendEmail`);
const productSchema = require(`../../models/productSchema`);

// ------------------ Signup Functions ------------------

exports.signup = (req, res) => {
    try {
        // Redirect to home if user session already exists, else render signup page
        if (req.session.user) {
            res.redirect(`/home`);
        } else {
            res.render(`user/signup`);
        }
    } catch (error) {
        console.log(`Error in signup GET request: ${error}`);
    }
};

exports.signupPost = async (req, res) => {
    try {
        // User data structure created from request body for new signup
        const userData = {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
        };

        // Check if user already exists by email to prevent duplicate accounts
        const existingUser = await userSchema.findOne({ email: userData.email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User already exists',
            });
        }

        // Generate and save a 6-digit OTP for email verification
        const otpCode = generateOtp();
        await otpSchema.create({ email: userData.email, otpCode, expiresAt: Date.now() + 2 * 60000 });
        await sendOtpEmail(userData.email, otpCode);

        // Hash password before storing in session
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        userData.password = hashedPassword;
        req.session.userData = userData;

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
        });
    } catch (error) {
        console.log(`Error in signup POST request: ${error}`);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during signup',
        });
    }
};

// ------------------ OTP Verification Functions ------------------

exports.verifyOtp = (req, res) => {
    try {
        if (req.session.user) {
            res.redirect(`/home`);
        } else {
            const email = req.session.userData.email; // Retrieve email from session for display on OTP page
            res.render(`user/otp`, { email });
        }
    } catch (error) {
        console.log(`Error in verify OTP GET request: ${error}`);
    }
};

exports.verifyOtpPost = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Retrieve OTP entry and check for existence and expiry
        const otpEntry = await otpSchema.findOne({ email, otpCode: otp });
        if (!otpEntry || otpEntry.expiresAt < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP',
            });
        }

        // On successful OTP verification, create user in database and delete OTP entry
        const userData = req.session.userData;
        await userSchema.create(userData);
        await otpEntry.deleteOne();

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
        });
    } catch (error) {
        console.log(`Error verifying OTP: ${error}`);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
        });
    }
};

exports.resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if an OTP entry exists before attempting resend
        const existingOTP = await otpSchema.findOne({ email });
        if (!existingOTP) {
            return res.status(404).json({
                success: false,
                message: 'Failed to resend OTP',
            });
        }

        // Generate new OTP, update in schema, and send via email
        const otpCode = generateOtp();
        await otpSchema.updateOne(
            { email },
            { otpCode, expiresAt: Date.now() + 2 * 60000 }
        );

        await sendOtpEmail(email, otpCode);
        res.status(200).json({
            success: true,
            message: 'OTP resent successfully',
        });
    } catch (error) {
        console.log(`Error resending OTP: ${error}`);
        res.status(500).json({
            success: false,
            message: 'An error occurred while resending OTP',
        });
    }
};

// ------------------ Login and Logout Functions ------------------

exports.login = (req, res) => {
    try {
        if (req.session.user) {
            res.redirect(`/`);
        } else {
            // Display block message if account is blocked, else show login page
            const blockedMessage = req.query.blocked ? 
                "Your account has been blocked, please contact support for further assistance." : 
                null;
            res.render(`user/login`, { blockedMessage });
        }
    } catch (error) {
        console.log(`Error in login GET request: ${error}`);
    }
};

exports.loginPost = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userSchema.findOne({ email });

        // Verify credentials, check if user is blocked, and initiate session on success
        if (user && await bcrypt.compare(password, user.password)) {
            if (user.isBlocked) {
                return res.status(401).json({
                    message: 'Your account has been blocked, please contact support for further assistance.',
                });
            }

            const firstName = user.name.split(' ')[0];
            req.session.userName = { name: firstName };
            req.session.user = email;
            req.session.userId = user.id;
            
            return res.status(200).json({ message: 'Login successful!' });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.log(`Error during login POST request: ${error}`);
        res.status(500).json({ message: 'An error occurred. Please try again later.' });
    }
};

exports.logout = (req, res) => {
    try {
        if (req.session.user) {
            delete req.session.user;
            req.session.save(err => {
                if (err) return res.status(500).send("Logout failed");
                req.session.userName = false;
                res.redirect('/');
            });
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log(`Error during logout: ${error}`);
    }
};

// ------------------ Landing Page Function ------------------

exports.landingPage = async (req, res) => {
    try {
        

        // Get latest products with unblocked categories and calculate discount prices
        let latestProducts = await productSchema
            .find({ isBlocked: false })
            .populate('category')
            .populate('brand')
            .sort({ createdAt: -1 })
            .limit(5);

        latestProducts = latestProducts.filter(product => !product.category.isBlocked && !product.brand.isBlocked);

        latestProducts.forEach(product => {
            const discountPrice = product.price - (product.price * (product.discount / 100));
            product.discountPrice = new Intl.NumberFormat('en-US').format(Math.round(discountPrice));
        });
        
            res.render(`user/home`, { latestProducts });
        
    } catch (error) {
        console.log(`Error in home function: ${error}`);
    }
};

