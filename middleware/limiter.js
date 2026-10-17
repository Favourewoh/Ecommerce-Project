const rateLimit = require('express-rate-limit');

// Admin registration limiter: 5 requests per 15 minutes per IP
const RegisterLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: 'Too many admin registration attempts from this IP, please try again after 15 minutes.' }
});

module.exports = {
    RegisterLimiter
};