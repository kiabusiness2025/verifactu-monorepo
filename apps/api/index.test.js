import request from 'supertest';
import app from './index.js';

describe('API Endpoints', () => {
  it('GET /api/healthz should return 200 OK', async () => {
    const response = await request(app).get('/api/healthz');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('ok');
  });

  it('GET /api/dashboard/summary should validate period', async () => {
    const response = await request(app).get('/api/dashboard/summary?period=month');
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('totals');
    expect(response.body).toHaveProperty('activity');
    expect(response.body).toHaveProperty('deadlines');
    expect(response.body).toHaveProperty('error');
  });

  it('GET /api/dashboard/summary?period=this_month returns stable contract', async () => {
    const response = await request(app).get('/api/dashboard/summary?period=this_month');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      totals: { sales: 0, expenses: 0, profit: 0 },
      activity: [],
      deadlines: [],
    });
  });
});
