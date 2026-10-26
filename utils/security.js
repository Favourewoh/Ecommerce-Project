const crypto = require('crypto');

// CRITICAL BOOT CHECKS
if (!process.env.ADMIN_SECRET_KEY || process.env.ADMIN_SECRET_KEY.length < 32 || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
  throw new Error("Admin key is missing or too short")
}

// pre-hashing admin secret key
const prehashedAdminSecret = crypto.createHash('sha256').update(String(process.env.ADMIN_SECRET_KEY)).digest();

// --- ADMIN KEY VALIDATION HELPER ---
const isValidAdminKey = (header) => {
    if (!header || typeof header !== 'string') {
        return false;
    }
    const providedHash = crypto.createHash('sha256').update(header).digest();
    
    if (providedHash.length !== prehashedAdminSecret.length) {
        return false;
    }
    
    return crypto.timingSafeEqual(providedHash, prehashedAdminSecret);
};

module.exports = {
    isValidAdminKey
}