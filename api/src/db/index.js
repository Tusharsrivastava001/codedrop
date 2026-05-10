const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'codedrop',
  password: process.env.POSTGRES_PASSWORD || 'changeme_in_production',
  database: process.env.POSTGRES_DB || 'codedropdb',
  max: Number(process.env.POSTGRES_POOL_SIZE || 10),
  idleTimeoutMillis: 30000
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snippets (
      id VARCHAR(12) PRIMARY KEY,
      title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
      language VARCHAR(50) NOT NULL DEFAULT 'plaintext',
      code TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

module.exports = {
  pool,
  initDb
};
