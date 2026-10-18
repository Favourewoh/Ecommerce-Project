const crypto = require('crypto');

// CRITICAL BOOT CHECKS
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT secret is missing or too short")
}
if (!adminSecretKey || adminSecretKey.length < 32) {
  throw new Error("Admin key is missing or too short")
}

// pre-hashing admin secret key
const prehashedAdminSecret = crypto.createHash('sha256').update(String(adminSecretKey)).digest();

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