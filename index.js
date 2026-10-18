// server.js
require('dotenv').config()
const express = require("express");
const authenticateToken = require("./middleware/auth");
const authorizeRoles = require("./middleware/authorize");
const PORT = process.env.PORT;
const app = express();
const authRouter = require('./routes/auth');

// boot checks
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT secret is missing or too short")
}

// to parse incoming data
app.use(express.json());
app.disable("x-powered-by");
app.use('/api/v1/auth', authRouter);



// let's route the dashboard

// Merchant and admin accessible route
app.get(
  "/api/v1/dashboard",
  authenticateToken,
  authorizeRoles("merchant", "admin"),
  (req, res) => {
    res.status(200).json({
      message: `Welcome to the dashboard, User #${req.user.id}`,
      Role: req.user.role,
    });
  },
);

// Admin only dashboard
app.get(
  "/api/v1/admin/dashboard",
  authenticateToken,
  authorizeRoles("admin"),
  (req, res) => {
    res.status(200).json({
      message: `Welcome to the Admin Control Panel`,
      Role: req.user.role,
    });
  },
);



app.listen(PORT, () => {
  console.log(`Server is running on port 3000`);
});
