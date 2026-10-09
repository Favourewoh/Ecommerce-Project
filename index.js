// server.js
const express = require("express");
const db = require("./db");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

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
      !first_name ||
      !first_name.trim() ||
      !last_name ||
      !last_name.trim() ||
      !email ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        message: "All field are required!",
      });
    }

    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail.includes("@")) {
      res.status(400).json({
        message: "Enter a valid email address",
      });
    }

    if (password.length < 8) {
      res.status(400).json({
        message: " Password must be at least 8 characters long!",
      });
    }

    // let's hash the password

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // parameterized queries

    const insertQuery = `
      INSERT INTO users (first_name, last_name, email, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, first_name, last_name, email, user_role, is_verified, created_at;`;

    const values = [
      first_name.trim(),
      last_name.trim(),
      cleanedEmail,
      password_hash,
    ];

    const result = await db.query(insertQuery, values);
    const newUser = result.rows[0];

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

    console.error("Registration database error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});




app.post('/api/v1/auth/login', async (req, res) => {
  
  try {
    
    const { email, password} = req.body;

    

    // check if required fields are present
    if(!email || !email.trim() || !password ) {
      return res.status(400).json({ message: "Email and password are required!"});
    };

    // clean the email
    let cleanEmail = email.toLowerCase().trim();

    // now I query the database for the user

    const userQuery = `
        SELECT id, first_name, last_name, email, password_hash, user_role, is_verified 
        FROM users 
        WHERE email = $1;
    `
    const result = await db.query(userQuery, [cleanEmail]);

// checking if the user exists

    if(result.rows.length === 0 ) {
      return res.status(401).json({ message: "Invalid email or password!"});
    };

    const user = result.rows[0];

// comparing input password with stored password

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if(!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password!"})
    }
    return (
      res.status(201).json({
        message: " User successfully logged in!",
        user: {
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.user_role,
          is_verified: user.is_verified
        }
      })
    );

  } catch (err) {
    console.error("Login error", err)
    return res.status(500).json({ message: "Interval server error."})
  }




})








app.listen(PORT, () => {
  console.log(`Server is running on port 3000`);
});
