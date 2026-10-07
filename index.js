// server.js
const express = require('express');
const db = require('./db/db');
const app = express();

app.use(express.json());

// Example route retrieving data from PostgreSQL
app.get('/users', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
