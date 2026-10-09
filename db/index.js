const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.pg_user,
  host: process.env.pg_host,
  database: process.env.pg_db,
  password: process.env.pg_pass,
  port: process.env.pg_port || 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
