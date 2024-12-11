// ==================
// Admin User Controller
// ==================

const userSchema = require('../../models/userSchema');
const { format } = require('date-fns');

// Show user page with pagination and search functionality
exports.userPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const search = req.query.search || "";

        // Create a search filter based on the query parameter
        const searchFilter = search ? { name: { $regex: search, $options: "i" } } : {};
        const offset = (page - 1) * limit;

        // Fetch users and total user count concurrently
        const [users, totalUsers] = await Promise.all([
            userSchema.find(searchFilter).sort({ createdAt: -1}).skip(offset).limit(limit),
            userSchema.countDocuments()
        ]);

        const totalPages = Math.ceil(totalUsers / limit);

        // Format the creation date for each user
        users.forEach(user => {
            user.formattedDate = format(user.createdAt, 'MMMM dd, yyyy');
        });

        // Render the users page with users and pagination data
        res.render('admin/customers', { users, currentPage: page, totalPages, limit, search });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server Error');
    }
};

// Block or unblock a user
exports.userBlockUnblock = async (req, res) => {
    const userId = req.params.id;
    const { block } = req.body; // true to block, false to unblock

    try {
        // Find the user by ID
        let user = await userSchema.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the user's isBlocked status
        user.isBlocked = block;
        await user.save();

        res.status(200).json({ message: block ? 'User blocked' : 'User unblocked' });
    } catch (error) {
        console.error('Error blocking/unblocking user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
