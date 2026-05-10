const request = require('supertest');

jest.mock('../src/db', () => ({
  pool: {
    query: jest.fn()
  },
  initDb: jest.fn()
}));

jest.mock('../src/db/redis', () => ({
  redisClient: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn()
  },
  connectRedis: jest.fn()
}));

const app = require('../src/app');
const { pool } = require('../src/db');
const { redisClient } = require('../src/db/redis');

describe('CodeDrop snippets API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisClient.get.mockResolvedValue(null);
    redisClient.setEx.mockResolvedValue('OK');
    redisClient.del.mockResolvedValue(1);
  });

  test('GET /health returns ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('POST /api/snippets creates a snippet', async () => {
    const created = {
      id: 'abc123def456',
      title: 'Hello',
      language: 'js',
      created_at: '2026-05-09T00:00:00.000Z'
    };
    pool.query.mockResolvedValueOnce({ rows: [created], rowCount: 1 });

    const response = await request(app)
      .post('/api/snippets')
      .send({ title: 'Hello', language: 'js', code: 'console.log("hi");' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(created);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO snippets'), [
      expect.any(String),
      'Hello',
      'js',
      'console.log("hi");'
    ]);
    expect(redisClient.del).toHaveBeenCalledWith(['snippets:recent']);
  });

  test('POST /api/snippets rejects empty code', async () => {
    const response = await request(app)
      .post('/api/snippets')
      .send({ title: 'Empty', language: 'python', code: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Code is required' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('GET /api/snippets/recent returns cached snippets first', async () => {
    const cached = [{ id: 'cached123456', title: 'Cached', language: 'go', views: 2 }];
    redisClient.get.mockResolvedValueOnce(JSON.stringify(cached));

    const response = await request(app).get('/api/snippets/recent');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'cache', data: cached });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('GET /api/snippets/recent falls back to DB and writes cache', async () => {
    const rows = [{ id: 'db1234567890', title: 'DB', language: 'sql', views: 4 }];
    pool.query.mockResolvedValueOnce({ rows });

    const response = await request(app).get('/api/snippets/recent');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'db', data: rows });
    expect(redisClient.setEx).toHaveBeenCalledWith('snippets:recent', 600, JSON.stringify(rows));
  });

  test('GET /api/snippets/:id returns cached snippet and increments views', async () => {
    const cached = {
      id: 'snippet12345',
      title: 'Cached snippet',
      language: 'ts',
      code: 'const x = 1;',
      views: 8,
      created_at: '2026-05-09T00:00:00.000Z'
    };
    redisClient.get.mockResolvedValueOnce(JSON.stringify(cached));
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app).get('/api/snippets/snippet12345');

    expect(response.status).toBe(200);
    expect(response.body.source).toBe('cache');
    expect(response.body.data.views).toBe(9);
    expect(pool.query).toHaveBeenCalledWith('UPDATE snippets SET views = views + 1 WHERE id = $1', [
      'snippet12345'
    ]);
  });

  test('GET /api/snippets/:id returns 404 when DB has no snippet', async () => {
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const response = await request(app).get('/api/snippets/missing12345');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Snippet not found' });
  });

  test('DELETE /api/snippets/:id deletes snippet and invalidates cache', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'delete123456' }], rowCount: 1 });

    const response = await request(app).delete('/api/snippets/delete123456');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deleted: true, id: 'delete123456' });
    expect(redisClient.del).toHaveBeenCalledWith(['snippet:delete123456', 'snippets:recent']);
  });
});
