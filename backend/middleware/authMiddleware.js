const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
    let token;

    // Check if the token is present in the Authorization header and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get the token from the header
            token = req.headers.authorization.split(' ')[1];

            // Verify the token 
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get the user from the token and attach it to the request object, excluding the password
            req.user = await User.findById(decoded.id).select('-password');

            next(); 
        } catch (error) {
            console.log(error);
            res.status(401).json({ message: 'Unauthorized' });// If token verification fails, return a 401 Unauthorized response
        }
    }

    if (!token) {
        res.status(401).json({ message: 'No token' });
    }
};

module.exports = { protect };

// Middleware to check if the user is an admin
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // If the user is an admin, allow them to proceed
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

// Export the protect and admin middleware functions so they can be used in other parts of the application, such as in route definitions to protect certain routes or restrict access to admin-only routes. 
module.exports = { protect, admin };