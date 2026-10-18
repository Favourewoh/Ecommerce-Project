const rateLimit = require('express-rate-limit');

// Admin registration limiter: 5 requests per 15 minutes per IP
const RegisterLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: 'Too many attempts, please try again later.' }
});

// Login limiter: 10 attempts per 15 minutes per IP (generous for accidental typos)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: 'Too many attempts, please try again later.' }
});

// Forgot password limiter: 3 requests per 15 minutes per IP (strict to prevent inbox flooding)
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 3,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: 'Too many attempts, please try again later.' }
});





module.exports = {
    RegisterLimiter,
    forgotPasswordLimiter,
    loginLimiter
};