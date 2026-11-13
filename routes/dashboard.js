const express = require('express');
const authenticateToken = require('../middleware/auth');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authorizeRoles = require('../middleware/authorize');

// user dashboard route
router.get("/user", 
    authenticateToken,
    authorizeRoles("merchant", "admin"),
    dashboardController.userDashboard)

// admin dashboard routes
router.get("/admin",
    authenticateToken,
    authorizeRoles("admin"),
    dashboardController.adminDashboard)



module.exports = router;