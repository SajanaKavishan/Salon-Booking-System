const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const wasTokenIssuedBeforePasswordChange = (decodedToken, passwordChangedAt) => {
    if (!passwordChangedAt) return false;

    const passwordChangedTime = new Date(passwordChangedAt).getTime();
    if (Number.isNaN(passwordChangedTime)) return false;

    const issuedAtSeconds = Number(decodedToken?.iat);
    if (!Number.isFinite(issuedAtSeconds)) return true;

    return issuedAtSeconds < Math.floor(passwordChangedTime / 1000);
};

const protect = async (req, res, next) => {
    // Check if the token is present in the Authorization header and starts with 'Bearer'
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
        return res.status(401).json({ message: 'No token' });
    }

    try {
        // Get the token from the header
        const token = req.headers.authorization.split(' ')[1]?.trim();

        if (!token || token.split('.').length !== 3) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Use an explicit allowlist. Reset tokens and other internal authentication
        // metadata must never be attached to downstream request handlers.
        req.user = await User.findById(decoded.id).select(
            '_id name email role phone preferredStylist profileImage isFirstLogin isActive passwordChangedAt'
        );

        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized. User no longer exists.' });
        }

        if (req.user.isActive === false) {
            return res.status(401).json({ message: 'Unauthorized. Account is inactive.' });
        }

        if (wasTokenIssuedBeforePasswordChange(decoded, req.user.passwordChangedAt)) {
            return res.status(401).json({
                message: 'Session expired because your password was changed. Please sign in again.'
            });
        }

        // passwordChangedAt is needed only for token revocation above. Remove it
        // before exposing req.user to controllers that may serialize the object.
        req.user.passwordChangedAt = undefined;

        return next();
    } catch (error) {
        const knownJwtErrors = ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'];
        if (knownJwtErrors.includes(error.name)) {
            console.warn(`Authentication failed: ${error.message}`);
            return res.status(401).json({ message: 'Unauthorized' });
        }

        console.error('Authentication middleware error:', error);
        return res.status(500).json({ message: 'Server error during authentication' });
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
    _test: {
        wasTokenIssuedBeforePasswordChange,
    },
};
