const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const authController = require('../controllers/authController')
const { validateAndSanitizeBody, hashPassword, generateVerificationToken } = require('../utils/authHelpers');
const { isValidAdminKey} = require('../utils/security');
const uniformAuthError = { message: "Access denied. Invalid secret key." };
const { RegisterLimiter, loginLimiter, forgotPasswordLimiter} = require('../middleware/limiter');

// admin registration route
router.post('/admin-register', RegisterLimiter , authController.adminRegister);

// merchant registration route
router.post("/register", RegisterLimiter, authController.register)

// verifying email router
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    // checking if token is a valid string and exists

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        message: "Invalid request. Verification token is required!",
      });
    }

    // now I going to hash the incoming token using SHA 256

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // I'll look up the hash in our database and also update is_verified if we find something

    const verificationQuery = `
        UPDATE users 
          SET is_verified = true, 
              email_verification_token_hash = NULL, 
              email_verification_expires_at = NULL, 
              updated_at = NOW() 
          WHERE email_verification_token_hash = $1 
            AND email_verification_expires_at > NOW() 
          RETURNING id, email;  
      `;
    const result = await db.query(verificationQuery, [tokenHash]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired link.",
      });
    }

    return res.status(200).json({
      message: "Email verified successfully! You can now log in.",
    });
  } catch (err) {
    console.error("Email verification error:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Login route
router.post("/login",loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // check for strings
    if (typeof email == !"string" || typeof password == !"string") {
      return res.status(400).json({
        message: "Invalid input in email or password",
      });
    }

    // check if required fields are present
    if (!email || !email.trim() || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required!" });
    }

    // clean the email
    let cleanEmail = email.toLowerCase().trim();

    // now I query the database for the user

    const userQuery = `
        SELECT id, first_name, last_name, email, password_hash, user_role, is_verified 
        FROM users 
        WHERE email = $1;
    `;
    const result = await db.query(userQuery, [cleanEmail]);

    // checking if the user exists

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password!" });
    }

    const user = result.rows[0];

    // comparing input password with stored password

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password!" });
    }

    // check account verification

    if (!user.is_verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    // Generate jwt

    const token = jwt.sign(
      { id: user.id, role: user.user_role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" },
    );

    return res.status(200).json({
      message: "User successfully logged in!",
      token,
      user: {
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.user_role,
        isVerified: user.is_verified,
      },
    });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// Forgot password endpoint
router.post("/forgot-password",forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // validating email input type and presence
    if (typeof email !== "string") {
      return res.status(400).json({
        message: "Invalid input. Email must be text string",
      });
    }

    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail) {
      return res.status(400).json({
        message: "Email is required!",
      });
    }

    // create message for feedback
    const genericReponseMessage = {
      message:
        "If an account with that email exists, a reset link has been sent",
    };

    
    // generate random token and hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // saving the hash and expiry to db in the same query
    const updateQuery = `
        UPDATE users
          SET password_reset_token_hash = $1,
              password_reset_expires_at = NOW() + INTERVAL '30 minutes',
              updated_at = NOW()
          WHERE LOWER (email)  = $2
        RETURNING id
    `;
    const result = await db.query(updateQuery, [tokenHash, cleanedEmail]);

    // if the user doesn't exist, no row updated

    if (result.rows.length === 0) {
      return res.status(200).json(genericReponseMessage);
    }

    //Printing reset link to terminal for testing
    const appUrl = process.env.APP_URL;
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    console.log(resetUrl);

    return res.status(200).json(genericReponseMessage);
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Reset password endpoint

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // confirm data type and presence
    if (typeof token !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({
        message: "Invalid input. Token and Password must be text strings",
      });
    }

    if (!token.trim() || !newPassword.trim()) {
      return res.status(400).json({
        message: "Token and new password are required.",
      });
    }

    // enforcing password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    // hashing the incoming token
    const tokenHash = crypto
      .createHash("sha256")
      .update(token.trim())
      .digest("hex");

    // hashing the new password
    const hashNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the database
    const resetQuery = `
      UPDATE users
        SET password_hash = $1,
            password_reset_token_hash = NULL,
            password_reset_expires_at = NULL,
            updated_at = NOW()
        WHERE password_reset_token_hash = $2
          AND password_reset_expires_at > NOW()
        RETURNING id, email;
   `;
    const result = await db.query(resetQuery, [hashNewPassword, tokenHash]);

    // token is invalid if no row is updated
    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired password reset token",
      });
    }

    // Success
    return res.status(200).json({
      message:
        "Password has been successfully reset. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;