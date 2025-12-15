import app from './index.js';
import request from 'supertest';

describe('Notifications Service', () => {
  it('should return health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe('notifications');
  });

  it('should create a new notification', async () => {
    const notificationData = {
      userId: 'user-123',
      message: 'Your invoice has been processed',
      type: 'success'
    };
    
    const res = await request(app)
      .post('/notifications')
      .send(notificationData);
    
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.userId).toBe(notificationData.userId);
    expect(res.body.data.message).toBe(notificationData.message);
    expect(res.body.data.type).toBe(notificationData.type);
    expect(res.body.data.status).toBe('unread');
    expect(res.body.data.id).toBeDefined();
  });

  it('should return 400 when creating notification without required fields', async () => {
    const res = await request(app)
      .post('/notifications')
      .send({ userId: 'user-123' }); // Missing message
    
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('should get all notifications', async () => {
    const res = await request(app).get('/notifications');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should filter notifications by userId', async () => {
    // Create notifications for different users
    await request(app)
      .post('/notifications')
      .send({ userId: 'user-456', message: 'Test 1' });
    
    await request(app)
      .post('/notifications')
      .send({ userId: 'user-789', message: 'Test 2' });
    
    // Get notifications for specific user
    const res = await request(app).get('/notifications?userId=user-456');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.every(n => n.userId === 'user-456')).toBe(true);
  });

  it('should get notification by ID', async () => {
    // First create a notification
    const createRes = await request(app)
      .post('/notifications')
      .send({ userId: 'user-111', message: 'Test notification' });
    
    const notificationId = createRes.body.data.id;
    
    // Then get it by ID
    const res = await request(app).get(`/notifications/${notificationId}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBe(notificationId);
  });

  it('should return 404 for non-existent notification', async () => {
    const res = await request(app).get('/notifications/NON-EXISTENT');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it('should mark notification as read', async () => {
    // First create a notification
    const createRes = await request(app)
      .post('/notifications')
      .send({ userId: 'user-222', message: 'Test' });
    
    const notificationId = createRes.body.data.id;
    
    // Mark it as read
    const res = await request(app).patch(`/notifications/${notificationId}/read`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('read');
    expect(res.body.data.readAt).toBeDefined();
  });

  it('should mark all notifications as read for a user', async () => {
    const userId = 'user-333';
    
    // Create multiple notifications for the user
    await request(app)
      .post('/notifications')
      .send({ userId, message: 'Notification 1' });
    
    await request(app)
      .post('/notifications')
      .send({ userId, message: 'Notification 2' });
    
    // Mark all as read
    const res = await request(app)
      .post('/notifications/mark-all-read')
      .send({ userId });
    
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.updatedCount).toBeGreaterThan(0);
  });

  it('should delete a notification', async () => {
    // First create a notification
    const createRes = await request(app)
      .post('/notifications')
      .send({ userId: 'user-444', message: 'Test' });
    
    const notificationId = createRes.body.data.id;
    
    // Then delete it
    const res = await request(app).delete(`/notifications/${notificationId}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    
    // Verify it's deleted
    const getRes = await request(app).get(`/notifications/${notificationId}`);
    expect(getRes.status).toBe(404);
  });
});
