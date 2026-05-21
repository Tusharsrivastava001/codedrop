const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'codedrop',
  password: process.env.POSTGRES_PASSWORD || 'changeme_in_production',
  database: process.env.POSTGRES_DB || 'codedropdb',
  max: Number(process.env.POSTGRES_POOL_SIZE || 10),
  idleTimeoutMillis: 30000,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snippets (
      id              VARCHAR(12)  PRIMARY KEY,
      title           VARCHAR(255) NOT NULL DEFAULT 'Untitled',
      language        VARCHAR(50)  NOT NULL DEFAULT 'plaintext',
      code            TEXT         NOT NULL,
      views           INTEGER      NOT NULL DEFAULT 0,
      expires_at      TIMESTAMP    NULL,
      password_hash   VARCHAR(255) NULL,
      burn_after_read BOOLEAN      NOT NULL DEFAULT FALSE,
      burned          BOOLEAN      NOT NULL DEFAULT FALSE,
      forked_from     VARCHAR(12),
      created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE snippets
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS burn_after_read BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS burned BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS forked_from VARCHAR(12);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_snippets_created_at ON snippets (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_snippets_language ON snippets (language);
    CREATE INDEX IF NOT EXISTS idx_snippets_expires_at ON snippets (expires_at);
    CREATE INDEX IF NOT EXISTS idx_snippets_views ON snippets (views DESC);
  `);
}

module.exports = {
  pool,
  initDb,
};
