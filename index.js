// server.js
const express = require("express");
const db = require("./db");
const bcrypt = require("bcrypt");
const crypto = require("crypto")

const PORT = process.env.PORT;
const app = express();

// to parse incoming data
app.use(express.json());

// Example route retrieving data from PostgreSQL
app.get("/users", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// check time and send to homepage

app.get("/", async (req, res) => {
  try {
    const sayTime = await db.query("SELECT NOW()");
    res.send(sayTime.rows[0].now);
  } catch (err) {
    console.log("it failed", err.message);
  }
});

// registration route

app.post("/api/v1/auth/register", async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    if (
            typeof first_name !== 'string' ||
            typeof last_name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({
                message: 'Invalid input, check email or password entry!'
            });
        }
// clean the provided email

    const cleanedEmail = email.trim().toLowerCase();

// checking for required fields
if (!first_name.trim() || !last_name.trim() || !cleanedEmail || !password) {
            return res.status(400).json({
                message: 'All fields are required.'
            });
        }


    if (!cleanedEmail.includes("@")) {
      return res.status(400).json({
        message: "Enter a valid email address",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long!",
      });
    }

    // let's hash the password

    const password_hash = await bcrypt.hash(password, 10);

    // create and hash the verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // parameterized queries

    const insertQuery = `
      INSERT INTO users (first_name, last_name, email, password_hash, email_verification_token_hash, email_verification_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, first_name, last_name, email, user_role, is_verified, created_at`;

    const values = [
      first_name.trim(),
      last_name.trim(),
      cleanedEmail,
      password_hash,
      tokenHash,
      tokenExpiresAt
    ];

    const result = await db.query(insertQuery, values);
    const newUser = result.rows[0];


    // Log the verification url
    const verificationUrl = `${process.env.APP_URL}/api/v1/auth/verify-email?token=${rawToken}`;
    console.log('EMAIL VERIFICATION LINK (Terminal Test Only):');
    console.log(verificationUrl);
    console.log('----------------------------------------------------');

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

    console.error("Registration error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// verifying email token

app.get('/api/v1/auth/verify-email', async (req, res) => {
  try {
      const { token } = req.query;

    // checking if token is a valid string and exists

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          message: "Invalid request. Verification token is required!"
        });
      }
    
    // now I going to hash the incoming token using SHA 256

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

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
    const result = await db.query(verificationQuery,[tokenHash])

    if (result.rows.length === 0) {
        return res.status(400).json({
          message: "Invalid or expired link."
        });
      }

    return res.status(200).json({
            message: 'Email verified successfully! You can now log in.'
        });

  } catch (err) {
    console.error("Email verification error:", err)
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});






// Login route

app.post("/api/v1/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

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
        message: "Please verify your email before logging in."
      })
    }

    return res.status(200).json({
      message: " User successfully logged in!",
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

app.listen(PORT, () => {
  console.log(`Server is running on port 3000`);
});
