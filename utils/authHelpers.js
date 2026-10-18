const crypto = require('crypto');
const bcrypt = require('bcrypt');

// creating re-usable helpers
const validateAndSanitizeBody = (body) => {
  if (!body || typeof body !== 'object') {
    const err = new Error("Invalid request body.");
    err.status = 400;
    throw err;
  }

  const { first_name, last_name, email, password } = body;

  if (typeof first_name !== 'string' || typeof last_name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    const err = new Error("All registration fields must be text strings.");
    err.status = 400;
    throw err;
  }

  if (!first_name.trim()) {
    const err = new Error("First name is required.");
    err.status = 400;
    throw err;
  }

  if (!last_name.trim()) {
    const err = new Error("Last name is required.");
    err.status = 400;
    throw err;
  }

  const cleanedEmail = email.trim().toLowerCase();

  if (!cleanedEmail || !cleanedEmail.includes("@")) {
    const err = new Error("Enter a valid email address.");
    err.status = 400;
    throw err;
  }

  if (!password) {
    const err = new Error("Password is required.");
    err.status = 400;
    throw err;
  }

  if (password.length < 8) {
    const err = new Error("Password must be at least 8 characters long.");
    err.status = 400;
    throw err;
  }

  if (password.length > 72) {
    const err = new Error("Password cannot exceed 72 characters.");
    err.status = 400;
    throw err;
  }

  return {
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: cleanedEmail,
    password: password
  };
};

const hashPassword = async (password) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

const generateVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
return { rawToken, tokenHash};
};


module.exports = {
  validateAndSanitizeBody,
  hashPassword,
  generateVerificationToken
};