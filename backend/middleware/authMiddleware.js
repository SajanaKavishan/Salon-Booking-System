const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
    // Check if the token is present in the Authorization header and starts with 'Bearer'
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
        return res.status(401).json({ message: 'No token' });
    }

    try {
        // Get the token from the header
        const token = req.headers.authorization.split(' ')[1];

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get the user from the token and attach it to the request object, excluding the password
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized. User no longer exists.' });
        }

        return next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

// Middleware to check if the user is an admin
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next(); // If the user is an admin, allow them to proceed
    }

    return res.status(403).json({ message: 'Forbidden' });
};

// Middleware to check if the user is either staff or admin
const staffOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) {
        return next();
    }

    return res.status(403).json({ message: 'Forbidden' });
};

module.exports = {
    protect,
    admin,
    staffOrAdmin,
};
