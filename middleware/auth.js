const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findOne({ _id: decoded.id, isActive: true });
        
        if (!user) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(401).json({ 
                error: 'Account is locked. Please try again later.' 
            });
        }

        // Add user to request object
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid authentication token' });
    }
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next(); 
    } catch (error) {
        logger.error('Admin check error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { auth, isAdmin }; 