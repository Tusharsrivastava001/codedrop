const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { pool } = require('../db');
const { redisClient } = require('../db/redis');

const router = express.Router();
const CACHE_TTL_SECONDS = 600;
const RECENT_CACHE_KEY = 'snippets:recent';
const STATS_CACHE_KEY = 'stats:dashboard';

const allowedLanguages = new Set([
  'javascript',
  'js',
  'typescript',
  'ts',
  'python',
  'py',
  'java',
  'go',
  'rust',
  'bash',
  'shell',
  'sql',
  'json',
  'html',
  'css',
  'yaml',
  'markdown',
  'plaintext',
]);

const languageAliases = {
  javascript: 'js',
  typescript: 'ts',
  py: 'python',
  shell: 'bash',
};

const extensionByLanguage = {
  js: 'js',
  ts: 'ts',
  python: 'py',
  java: 'java',
  go: 'go',
  rust: 'rs',
  bash: 'sh',
  sql: 'sql',
  json: 'json',
  html: 'html',
  css: 'css',
  yaml: 'yml',
  markdown: 'md',
  plaintext: 'txt',
};

const createSnippetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Rate limit exceeded. Please try again soon.' },
});

function normalizeTitle(title) {
  if (typeof title !== 'string' || title.trim().length === 0) {
    return 'Untitled';
  }
  return title.trim().slice(0, 255);
}

function normalizeLanguage(language) {
  if (typeof language !== 'string') {
    return 'plaintext';
  }
  const normalized = language.trim().toLowerCase();
  const aliased = languageAliases[normalized] || normalized;
  return allowedLanguages.has(normalized) || allowedLanguages.has(aliased) ? aliased : 'plaintext';
}

function parseExpiry(body) {
  if (typeof body.expires_at === 'string' && body.expires_at.trim()) {
    const parsed = new Date(body.expires_at);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const value = typeof body.expires_in === 'string' ? body.expires_in.toLowerCase() : 'never';
  const now = Date.now();
  const durations = {
    '1h': 60 * 60 * 1000,
    '1 hour': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '24 hours': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '7 days': 7 * 24 * 60 * 60 * 1000,
  };

  return durations[value] ? new Date(now + durations[value]) : null;
}

function isExpired(row) {
  return row.expires_at && new Date(row.expires_at).getTime() <= Date.now();
}

function isBurned(row) {
  return Boolean(row.burned);
}

function lockedSnippet(row) {
  return {
    locked: true,
    id: row.id,
    title: row.title,
    language: row.language,
    views: Number(row.views || 0),
    expires_at: row.expires_at,
    burn_after_read: Boolean(row.burn_after_read),
    created_at: row.created_at,
  };
}

function publicSnippet(row) {
  return {
    id: row.id,
    title: row.title,
    language: row.language,
    code: row.code,
    views: Number(row.views || 0),
    expires_at: row.expires_at,
    burn_after_read: Boolean(row.burn_after_read),
    burned: Boolean(row.burned),
    forked_from: row.forked_from,
    created_at: row.created_at,
  };
}

async function readCache(key) {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
}

async function writeCache(key, value, ttl = CACHE_TTL_SECONDS) {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    return undefined;
  }
}

async function deleteCache(keys) {
  try {
    await redisClient.del(keys);
  } catch (error) {
    return undefined;
  }
}

async function invalidateSnippetCaches(id) {
  await deleteCache([`snippet:${id}`, RECENT_CACHE_KEY, STATS_CACHE_KEY]);
}

async function fetchSnippet(id, { useCache = true } = {}) {
  const cacheKey = `snippet:${id}`;
  if (useCache) {
    const cached = await readCache(cacheKey);
    if (cached) {
      if (isExpired(cached)) {
        await pool.query('DELETE FROM snippets WHERE id = $1', [id]);
        await invalidateSnippetCaches(id);
        return { status: 'expired' };
      }
      if (isBurned(cached)) {
        return { status: 'burned' };
      }
      return { status: 'ok', source: 'cache', row: cached };
    }
  }

  const result = await pool.query(
    `SELECT id, title, language, code, views, expires_at, password_hash, burn_after_read, burned, forked_from, created_at
     FROM snippets
     WHERE id = $1`,
    [id],
  );

  if (result.rowCount === 0) {
    return { status: 'missing' };
  }

  const row = result.rows[0];
  if (isExpired(row)) {
    await pool.query('DELETE FROM snippets WHERE id = $1', [id]);
    await invalidateSnippetCaches(id);
    return { status: 'expired' };
  }
  if (isBurned(row)) {
    return { status: 'burned' };
  }

  if (!row.burn_after_read) {
    await writeCache(cacheKey, row);
  }
  return { status: 'ok', source: 'db', row };
}

function statusResponse(res, snippet, text = false) {
  if (snippet.status === 'missing') {
    return text
      ? res.status(404).type('text/plain').send('Snippet not found')
      : res.status(404).json({ error: 'Snippet not found or expired' });
  }
  if (snippet.status === 'expired') {
    return text
      ? res.status(410).type('text/plain').send('Snippet expired')
      : res.status(410).json({ error: 'Snippet not found or expired' });
  }
  if (snippet.status === 'burned') {
    return text ? res.status(410).type('text/plain').send('Snippet burned') : res.status(410).json({ error: 'Snippet burned' });
  }
  return null;
}

async function markViewed(row, req) {
  const updatedViews = Number(row.views || 0) + 1;
  const burned = Boolean(row.burn_after_read);

  await pool.query(
    `UPDATE snippets
     SET views = views + 1,
         burned = CASE WHEN burn_after_read = TRUE THEN TRUE ELSE burned END
     WHERE id = $1`,
    [row.id],
  );

  row.views = updatedViews;
  row.burned = burned;
  await invalidateSnippetCaches(row.id);
  req.app.locals.metrics?.snippetViews?.inc();
  return row;
}

async function verifyPassword(row, password) {
  if (!row.password_hash) {
    return true;
  }
  return bcrypt.compare(typeof password === 'string' ? password : '', row.password_hash);
}

router.post('/', createSnippetLimiter, async (req, res, next) => {
  try {
    const title = normalizeTitle(req.body.title);
    const language = normalizeLanguage(req.body.language);
    const code = typeof req.body.code === 'string' ? req.body.code.trimEnd() : '';
    const expiresAt = parseExpiry(req.body);
    const burnAfterRead = Boolean(req.body.burn_after_read);
    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';

    if (!code.trim()) {
      return res.status(400).json({ error: 'Code is required' });
    }
    if (code.length > 50 * 1024) {
      return res.status(400).json({ error: 'Code must be 50KB or smaller' });
    }
    if (typeof req.body.title === 'string' && req.body.title.length > 255) {
      return res.status(400).json({ error: 'Title must be 255 characters or fewer' });
    }
    if (typeof req.body.language === 'string' && !allowedLanguages.has(req.body.language.toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    const id = nanoid(12);
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const result = await pool.query(
      `INSERT INTO snippets (id, title, language, code, views, expires_at, password_hash, burn_after_read, burned)
       VALUES ($1, $2, $3, $4, 0, $5, $6, $7, FALSE)
       RETURNING id, title, language, views, expires_at, burn_after_read, created_at`,
      [id, title, language, code, expiresAt, passwordHash, burnAfterRead],
    );

    await deleteCache([RECENT_CACHE_KEY, STATS_CACHE_KEY]);
    req.app.locals.metrics?.snippetsCreated?.inc();
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.get('/recent', async (req, res, next) => {
  try {
    const cached = await readCache(RECENT_CACHE_KEY);
    if (cached) {
      return res.json({ source: 'cache', data: cached });
    }

    const result = await pool.query(
      `SELECT id, title, language, code, views, expires_at, burn_after_read, created_at
       FROM snippets
       WHERE burned = FALSE AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT 100`,
    );

    await writeCache(RECENT_CACHE_KEY, result.rows, 60);
    return res.json({ source: 'db', data: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const language = normalizeLanguage(req.query.language || req.query.lang || '');
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
    const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
    const limit = 10;
    const offset = (page - 1) * limit;
    const values = [];
    const clauses = ['burned = FALSE', '(expires_at IS NULL OR expires_at > NOW())'];

    if (q) {
      values.push(`%${q}%`);
      clauses.push(`(title ILIKE $${values.length} OR code ILIKE $${values.length})`);
    }
    if (req.query.language || req.query.lang) {
      values.push(language);
      clauses.push(`language = $${values.length}`);
    }

    const orderBy = {
      views: 'views DESC, created_at DESC',
      expiring: 'expires_at ASC NULLS LAST, created_at DESC',
      newest: 'created_at DESC',
    }[sort] || 'created_at DESC';

    values.push(limit, offset);
    const result = await pool.query(
      `SELECT id, title, language, code, views, expires_at, burn_after_read, created_at
       FROM snippets
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    return res.json({ data: result.rows, page, page_size: limit });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/verify', async (req, res, next) => {
  try {
    const snippet = await fetchSnippet(req.params.id, { useCache: false });
    const handled = statusResponse(res, snippet);
    if (handled) return handled;

    const valid = await verifyPassword(snippet.row, req.body.password);
    if (!valid) {
      return res.json({ valid: false });
    }

    const row = await markViewed(snippet.row, req);
    return res.json({ valid: true, data: publicSnippet(row) });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/unlock', async (req, res, next) => {
  try {
    const snippet = await fetchSnippet(req.params.id, { useCache: false });
    const handled = statusResponse(res, snippet);
    if (handled) return handled;

    const valid = await verifyPassword(snippet.row, req.body.password);
    if (!valid) {
      return res.status(401).json({ error: 'Wrong password' });
    }

    const row = await markViewed(snippet.row, req);
    return res.json({ source: snippet.source, data: publicSnippet(row) });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/raw', async (req, res, next) => {
  try {
    const snippet = await fetchSnippet(req.params.id, { useCache: false });
    const handled = statusResponse(res, snippet, true);
    if (handled) return handled;

    const password = req.get('x-snippet-password') || req.query.password || '';
    const valid = await verifyPassword(snippet.row, password);
    if (!valid) {
      return res.status(403).type('text/plain').send('Password required');
    }

    const row = await markViewed(snippet.row, req);
    return res.type('text/plain').send(row.code);
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/download', async (req, res, next) => {
  try {
    const snippet = await fetchSnippet(req.params.id, { useCache: false });
    const handled = statusResponse(res, snippet);
    if (handled) return handled;

    const password = req.get('x-snippet-password') || req.query.password || '';
    const valid = await verifyPassword(snippet.row, password);
    if (!valid) {
      return res.status(403).json({ error: 'Password required' });
    }

    const extension = extensionByLanguage[snippet.row.language] || 'txt';
    const safeTitle = snippet.row.title.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40) || 'snippet';
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.${extension}"`);
    return res.type('text/plain').send(snippet.row.code);
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/fork', async (req, res, next) => {
  try {
    const snippet = await fetchSnippet(req.params.id, { useCache: false });
    const handled = statusResponse(res, snippet);
    if (handled) return handled;

    const id = nanoid(12);
    const source = snippet.row;
    const result = await pool.query(
      `INSERT INTO snippets (id, title, language, code, password_hash, expires_at, burn_after_read, burned, forked_from)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, $7)
       RETURNING id`,
      [id, source.title, source.language, source.code, source.password_hash || null, source.expires_at || null, source.id],
    );

    await deleteCache([RECENT_CACHE_KEY, STATS_CACHE_KEY]);
    req.app.locals.metrics?.snippetsCreated?.inc();
    return res.status(201).json({ id: result.rows[0].id, forked_from: source.id });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const snippet = await fetchSnippet(req.params.id);
    const handled = statusResponse(res, snippet);
    if (handled) return handled;

    if (snippet.row.password_hash) {
      return res.json({ source: snippet.source, data: lockedSnippet(snippet.row) });
    }

    const row = await markViewed(snippet.row, req);
    return res.json({ source: snippet.source, data: publicSnippet(row) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM snippets WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    await invalidateSnippetCaches(req.params.id);
    return res.json({ deleted: true, id: req.params.id });
  } catch (error) {
    return next(error);
  }
});

setInterval(async () => {
  try {
    const deleted = await pool.query('DELETE FROM snippets WHERE expires_at IS NOT NULL AND expires_at < NOW() RETURNING id');
    await Promise.all(deleted.rows.map((row) => invalidateSnippetCaches(row.id)));
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Expired snippet cleanup failed', error);
    }
  }
}, 5 * 60 * 1000).unref();

module.exports = router;
