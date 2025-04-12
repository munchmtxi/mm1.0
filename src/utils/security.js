const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer'); // Assuming you switched from xss-clean
const csrf = require('csurf');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('./logger');
const { JWT_SECRET } = process.env;

// Middleware for security headers and protections
const applySecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
});

// Middleware to sanitize inputs against XSS
const sanitizeXSS = () => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      xss()(req, res, next);
    } else {
      next();
    }
  };
};


// CSRF protection middleware
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

// Generate CSRF token for client-side use
const generateCsrfToken = (req, res) => {
  const token = req.csrfToken();
  res.cookie('XSRF-TOKEN', token, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return token;
};

// Password hashing
const hashPassword = async (password, saltRounds = 12) => {
  try {
    return await bcrypt.hash(password, saltRounds);
  } catch (err) {
    logger.error(`Password hashing error: ${err.message}`);
    throw new Error('Password hashing failed');
  }
};

// Password comparison
const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (err) {
    logger.error(`Password comparison error: ${err.message}`);
    throw new Error('Password comparison failed');
  }
};

// Generate JWT token
const generateJwtToken = (payload, options = {}) => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '1d',
      ...options,
    });
  } catch (err) {
    logger.error(`JWT generation error: ${err.message}`);
    throw new Error('JWT generation failed');
  }
};

// Verify JWT token
const verifyJwtToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    logger.error(`JWT verification error: ${err.message}`);
    throw new Error('Invalid or expired token');
  }
};

// Validate input against common attack patterns
const validateInput = (input, type = 'string') => {
  if (!input) return false;
  switch (type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    case 'phone':
      return /^\+?[1-9]\d{1,14}$/.test(input);
    case 'password':
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(input);
    case 'string':
      return typeof input === 'string' && input.length > 0 && !/[<>;{}]/.test(input);
    default:
      return false;
  }
};

module.exports = {
  applySecurityHeaders,
  sanitizeXSS,
  csrfProtection,
  generateCsrfToken,
  hashPassword,
  comparePassword,
  generateJwtToken,
  verifyJwtToken,
  validateInput,
};