const rateLimit = require('express-rate-limit');

// Admin registration limiter: 5 requests per 15 minutes per IP
const RegisterLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: 'Too many admin registration attempts from this IP, please try again after 15 minutes.' }
});

// Login limiter: 10 attempts per 15 minutes per IP (generous for accidental typos)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' }
});

// Forgot password limiter: 3 requests per 15 minutes per IP (strict to prevent inbox flooding)
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: 'Too many password reset requests from this IP, please try again after 15 minutes.' }
});





module.exports = {
    RegisterLimiter,
    forgotPasswordLimiter,
    loginLimiter
};