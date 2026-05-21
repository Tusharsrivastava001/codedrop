const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const os = require('os');
const client = require('prom-client');
const snippetsRouter = require('./routes/snippets');
const { pool } = require('./db');
const { redisClient } = require('./db/redis');

const app = express();
const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'codedrop_',
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '64kb' }));

app.locals.metrics = {
  snippetsCreated: new client.Counter({
    name: 'codedrop_snippets_created_total',
    help: 'Total snippets created',
    registers: [register],
  }),
  snippetViews: new client.Counter({
    name: 'codedrop_snippet_views_total',
    help: 'Total snippet views served',
    registers: [register],
  }),
};

async function measure(check) {
  const started = process.hrtime.bigint();
  try {
    await check();
    const latency = Number(process.hrtime.bigint() - started) / 1000000;
    return { status: 'ok', latency_ms: Number(latency.toFixed(2)) };
  } catch (error) {
    const latency = Number(process.hrtime.bigint() - started) / 1000000;
    return { status: 'error', latency_ms: Number(latency.toFixed(2)) };
  }
}

app.get('/health', async (req, res) => {
  const [database, cache] = await Promise.all([
    measure(() => pool.query('SELECT 1')),
    measure(() => redisClient.ping()),
  ]);
  const memoryUsage = process.memoryUsage();
  const usedMb = memoryUsage.rss / 1024 / 1024;
  const totalMb = os.totalmem() / 1024 / 1024;
  const status = database.status === 'ok' && cache.status === 'ok' ? 'ok' : 'down';

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      database,
      cache,
    },
    memory: {
      used_mb: Number(usedMb.toFixed(2)),
      total_mb: Number(totalMb.toFixed(2)),
      percent: Number(((usedMb / totalMb) * 100).toFixed(2)),
    },
  });
});

app.get('/metrics', async (req, res, next) => {
  try {
    res.set('Content-Type', register.contentType);
    return res.send(await register.metrics());
  } catch (error) {
    return next(error);
  }
});

app.get('/api/stats', async (req, res, next) => {
  const cacheKey = 'stats:dashboard';

  async function readStatsCache() {
    try {
      const cached = await redisClient.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  async function writeStatsCache(value) {
    try {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(value));
    } catch (error) {
      return undefined;
    }
  }

  try {
    const cached = await readStatsCache();
    if (cached) {
      return res.json({ source: 'cache', data: cached });
    }

    const [totals, topLanguages, mostViewed, today, hitsRaw, missesRaw] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total_snippets, COALESCE(SUM(views), 0)::int AS total_views FROM snippets WHERE burned = FALSE'),
      pool.query(
        `SELECT language, COUNT(*)::int AS count
         FROM snippets
         WHERE burned = FALSE
         GROUP BY language
         ORDER BY count DESC, language ASC
         LIMIT 5`,
      ),
      pool.query(
        `SELECT id, title, views
         FROM snippets
         WHERE burned = FALSE
         ORDER BY views DESC, created_at DESC
         LIMIT 5`,
      ),
      pool.query("SELECT COUNT(*)::int AS snippets_today FROM snippets WHERE burned = FALSE AND created_at >= date_trunc('day', NOW())"),
      redisClient.get('stats:cache_hits').catch(() => '0'),
      redisClient.get('stats:cache_misses').catch(() => '0'),
    ]);

    const hits = Number(hitsRaw || 0);
    const misses = Number(missesRaw || 0);
    const stats = {
      total_snippets: totals.rows[0].total_snippets,
      total_views: totals.rows[0].total_views,
      most_popular_language: topLanguages.rows[0]?.language || 'plaintext',
      top_languages: topLanguages.rows,
      most_viewed: mostViewed.rows,
      snippets_today: today.rows[0].snippets_today,
      cache_hit_rate: hits + misses > 0 ? `${Math.round((hits / (hits + misses)) * 100)}%` : '0%',
    };

    await writeStatsCache(stats);
    return res.json({ source: 'db', data: stats });
  } catch (error) {
    return next(error);
  }
});

app.use('/api/snippets', snippetsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
  });
});

module.exports = app;
