const request = require('supertest');

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}), { virtual: true });

jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()), { virtual: true });

jest.mock('../src/db', () => ({
  pool: {
    query: jest.fn(),
  },
  initDb: jest.fn(),
}));

jest.mock('../src/db/redis', () => ({
  redisClient: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    ping: jest.fn(),
  },
  connectRedis: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { pool } = require('../src/db');
const { redisClient } = require('../src/db/redis');

function snippet(overrides = {}) {
  return {
    id: 'snippet12345',
    title: 'Snippet',
    language: 'js',
    code: 'console.log("hi");',
    views: 0,
    expires_at: null,
    password_hash: null,
    burn_after_read: false,
    burned: false,
    forked_from: null,
    created_at: '2026-05-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('CodeDrop snippets API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('hashed-password');
    bcrypt.compare.mockResolvedValue(true);
    redisClient.get.mockResolvedValue(null);
    redisClient.setEx.mockResolvedValue('OK');
    redisClient.del.mockResolvedValue(1);
    redisClient.incr.mockResolvedValue(1);
    redisClient.ping.mockResolvedValue('PONG');
  });

  test('GET /health returns detailed ok status', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.services.database.status).toBe('ok');
    expect(response.body.services.cache.status).toBe('ok');
  });

  test('POST /api/snippets creates a locked snippet with expiry metadata', async () => {
    const created = snippet({
      id: 'abc123def456', title: 'Hello', code: undefined, password_hash: undefined,
    });
    pool.query.mockResolvedValueOnce({ rows: [created], rowCount: 1 });

    const response = await request(app)
      .post('/api/snippets')
      .send({
        title: 'Hello',
        language: 'js',
        code: 'console.log("hi");',
        expires_at: '2026-05-20T12:00:00.000Z',
        password: 'secret',
        burn_after_read: true,
      });

    expect(response.status).toBe(201);
    expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO snippets'), [
      expect.any(String),
      'Hello',
      'js',
      'console.log("hi");',
      expect.any(Date),
      'hashed-password',
      true,
    ]);
  });

  test('POST /api/snippets rejects empty code', async () => {
    const response = await request(app).post('/api/snippets').send({ title: 'Empty', language: 'python', code: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Code is required' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('GET /api/snippets/:id returns locked marker without code', async () => {
    pool.query.mockResolvedValueOnce({ rows: [snippet({ password_hash: 'hashed-password' })], rowCount: 1 });

    const response = await request(app).get('/api/snippets/snippet12345');

    expect(response.status).toBe(200);
    expect(response.body.data.locked).toBe(true);
    expect(response.body.data.code).toBeUndefined();
  });

  test('GET /api/snippets/:id returns 410 for expired snippets', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [snippet({ expires_at: '2020-01-01T00:00:00.000Z' })], rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app).get('/api/snippets/expired12345');

    expect(response.status).toBe(410);
    expect(response.body).toEqual({ error: 'Snippet not found or expired' });
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM snippets WHERE id = $1', ['expired12345']);
  });

  test('POST /api/snippets/:id/verify returns full snippet on password match', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [snippet({ password_hash: 'hashed-password' })], rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app).post('/api/snippets/snippet12345/verify').send({ password: 'secret' });

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(response.body.data.code).toBe('console.log("hi");');
    expect(bcrypt.compare).toHaveBeenCalledWith('secret', 'hashed-password');
  });

  test('GET /api/snippets/:id burns burn-after-read snippets after first view', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [snippet({ burn_after_read: true })], rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app).get('/api/snippets/snippet12345');

    expect(response.status).toBe(200);
    expect(response.body.data.burned).toBe(true);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SET views = views + 1'), ['snippet12345']);
  });

  test('GET /api/snippets/:id/raw returns plain text code', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [snippet({ id: 'raw123456789', language: 'bash', code: 'echo hi' })], rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app).get('/api/snippets/raw123456789/raw');

    expect(response.status).toBe(200);
    expect(response.text).toBe('echo hi');
    expect(response.headers['content-type']).toContain('text/plain');
  });

  test('GET /api/snippets/search returns paged DB results', async () => {
    const rows = [snippet({ id: 'find12345678', title: 'Find me', code: 'const found = true;' })];
    pool.query.mockResolvedValueOnce({ rows });

    const response = await request(app).get('/api/snippets/search?q=find&language=js&sort=views&page=2');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: rows, page: 2, page_size: 10 });
  });

  test('GET /api/stats returns dashboard metrics', async () => {
    redisClient.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('7')
      .mockResolvedValueOnce('3');
    pool.query
      .mockResolvedValueOnce({ rows: [{ total_snippets: 5, total_views: 20 }] })
      .mockResolvedValueOnce({ rows: [{ language: 'js', count: 3 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'top123456789', title: 'Top', views: 10 }] })
      .mockResolvedValueOnce({ rows: [{ snippets_today: 2 }] });

    const response = await request(app).get('/api/stats');

    expect(response.status).toBe(200);
    expect(response.body.data.most_popular_language).toBe('js');
    expect(response.body.data.cache_hit_rate).toBe('70%');
  });
});
