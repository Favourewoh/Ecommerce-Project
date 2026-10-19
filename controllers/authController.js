const db = require('../db')
const { validateAndSanitizeBody, hashPassword, generateVerificationToken } = require('../utils/authHelpers');


const register = async (req, res) => {
  try {
    const sanitizedData = validateAndSanitizeBody(req.body);

    // let's hash the password
    const passwordHash = await hashPassword(sanitizedData.password);

    // create and hash the verification token
    const {rawToken, tokenHash} = generateVerificationToken();

    // parameterized queries

    const insertQuery = `
      INSERT INTO users 
      (
      first_name, last_name, email, password_hash, email_verification_token_hash, email_verification_expires_at)
      VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '24 hours')
      RETURNING id, first_name, last_name, email, user_role, is_verified, created_at`;

    const values = [
      sanitizedData.first_name,
      sanitizedData.last_name,
      sanitizedData.email,
      passwordHash,
      tokenHash
    ];

    const result = await db.query(insertQuery, values);
    const newUser = result.rows[0];

    // Log the verification url
    const verificationUrl = `${process.env.APP_URL}/api/v1/auth/verify-email?token=${rawToken}`;
    console.log("EMAIL VERIFICATION LINK (Terminal Test Only):");
    console.log(verificationUrl);
    console.log("----------------------------------------------------");

    return res.status(201).json({
      message: "User registered successfully!",
      user: newUser,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        message: "An account with this email address already exists.",
      });
    }
    if (err.status === 400) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
    register
};