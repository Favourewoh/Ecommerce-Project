// server.js
require('dotenv').config()
const express = require("express");
const PORT = process.env.PORT;
const authRouter = require('./routes/auth');
const helmet = require('helmet');
const cors = require('cors');
const dashboardRouter = require('./routes/dashboard');
const app = express();

app.use(helmet());

// 2. CORS Configuration
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()) 
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// boot checks
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT secret is missing or too short")
};

// to parse incoming data
app.use(express.json());

// auth
app.use('/api/v1/auth', authRouter);



//dashboard
app.use('/api/v1/dashboard', dashboardRouter)



app.listen(PORT, () => {
  console.log(`Server is running on port 3000`);
});
