const { Pool } = require('pg');

// Conexión a Supabase (PostgreSQL). DATABASE_URL viene del archivo .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase exige SSL
});

module.exports = pool;
