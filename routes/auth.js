const express = require('express');
const router = express.Router();
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
router.post("/reset-password", authController.resetPassword);

module.exports = router;