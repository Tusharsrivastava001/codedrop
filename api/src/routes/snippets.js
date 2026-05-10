const express = require('express');
const { nanoid } = require('nanoid');
const { pool } = require('../db');
const { redisClient } = require('../db/redis');

const router = express.Router();
const CACHE_TTL_SECONDS = 600;
const RECENT_CACHE_KEY = 'snippets:recent';

const allowedLanguages = new Set([
  'js',
  'ts',
  'python',
  'java',
  'go',
  'rust',
  'bash',
  'sql',
  'json',
  'html',
  'css',
  'plaintext'
]);

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
  return allowedLanguages.has(normalized) ? normalized : 'plaintext';
}

async function readCache(key) {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
}

async function writeCache(key, value) {
  try {
    await redisClient.setEx(key, CACHE_TTL_SECONDS, JSON.stringify(value));
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

router.post('/', async (req, res, next) => {
  try {
    const title = normalizeTitle(req.body.title);
    const language = normalizeLanguage(req.body.language);
    const code = typeof req.body.code === 'string' ? req.body.code.trimEnd() : '';

    if (!code.trim()) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const id = nanoid(12);
    const result = await pool.query(
      `INSERT INTO snippets (id, title, language, code)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, language, created_at`,
      [id, title, language, code]
    );

    await deleteCache([RECENT_CACHE_KEY]);
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
      `SELECT id, title, language, views, created_at
       FROM snippets
       ORDER BY created_at DESC
       LIMIT 10`
    );

    await writeCache(RECENT_CACHE_KEY, result.rows);
    return res.json({ source: 'db', data: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `snippet:${id}`;
    const cached = await readCache(cacheKey);

    if (cached) {
      const updatedSnippet = { ...cached, views: Number(cached.views || 0) + 1 };
      await pool.query('UPDATE snippets SET views = views + 1 WHERE id = $1', [id]);
      await writeCache(cacheKey, updatedSnippet);
      await deleteCache([RECENT_CACHE_KEY]);
      return res.json({ source: 'cache', data: updatedSnippet });
    }

    const result = await pool.query(
      `UPDATE snippets
       SET views = views + 1
       WHERE id = $1
       RETURNING id, title, language, code, views, created_at`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    await writeCache(cacheKey, result.rows[0]);
    await deleteCache([RECENT_CACHE_KEY]);
    return res.json({ source: 'db', data: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM snippets WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    await deleteCache([`snippet:${id}`, RECENT_CACHE_KEY]);
    return res.json({ deleted: true, id });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
