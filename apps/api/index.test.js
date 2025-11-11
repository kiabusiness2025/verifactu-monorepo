import request from 'supertest';
import app from './index.js';

describe('API Endpoints', () => {
  it('GET /api/healthz should return 200 OK', async () => {
    const response = await request(app).get('/api/healthz');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('ok');
  });
});
