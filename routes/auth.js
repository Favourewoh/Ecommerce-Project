const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const authController = require('../controllers/authController')

const { RegisterLimiter, loginLimiter, forgotPasswordLimiter} = require('../middleware/limiter');

// admin registration route
router.post('/admin-register', RegisterLimiter , authController.adminRegister);

// merchant registration route
router.post("/register", RegisterLimiter, authController.register)

// verifying email router
router.get("/verify-email", authController.emailVerification);

// Login route
router.post("/login",loginLimiter, authController.login);

// Forgot password endpoint
router.post("/forgot-password",forgotPasswordLimiter, authController.forgotPassword);

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