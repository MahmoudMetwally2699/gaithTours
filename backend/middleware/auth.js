const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check for token in header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin middleware - allows admin, super_admin, and sub_admin roles
const admin = async (req, res, next) => {
  const adminRoles = ['admin', 'super_admin', 'sub_admin'];
  if (req.user && adminRoles.includes(req.user.role)) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

// Super admin only middleware
const superAdmin = async (req, res, next) => {
  // Allow both 'admin' (legacy) and 'super_admin' roles
  if (req.user && (req.user.role === 'super_admin' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Super admin role required.' });
  }
};

// Permission-based middleware for sub-admins
const hasPermission = (requiredPermission) => {
  return (req, res, next) => {
    // Super admins and legacy admins have all permissions
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      return next();
    }

    // Sub-admins need specific permission
    if (req.user.role === 'sub_admin' &&
        req.user.adminPermissions &&
        req.user.adminPermissions.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({
      message: `You do not have permission to access this resource. Required: ${requiredPermission}`
    });
  };
};

module.exports = { protect, admin, superAdmin, hasPermission };
