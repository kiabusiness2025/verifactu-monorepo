const request = require('supertest');
const { expect } = require('chai');
const { createApp } = require('./index');

const app = createApp();

describe('Notifications service', () => {
  it('creates and lists notifications filtered by user', async () => {
    const createRes = await request(app)
      .post('/notifications')
      .send({ userId: 'user-1', message: 'Welcome!' });

    expect(createRes.status).to.equal(201);
    expect(createRes.body.status).to.equal('unread');

    const listRes = await request(app).get('/notifications').query({ userId: 'user-1' });
    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.have.lengthOf(1);
    expect(listRes.body[0].message).to.equal('Welcome!');
  });

  it('marks notifications read and unread', async () => {
    const { body } = await request(app)
      .post('/notifications')
      .send({ userId: 'user-2', message: 'Action needed' });

    const readRes = await request(app).patch(`/notifications/${body.id}/read`);
    expect(readRes.status).to.equal(200);
    expect(readRes.body.status).to.equal('read');
    expect(readRes.body.readAt).to.be.a('string');

    const unreadRes = await request(app).patch(`/notifications/${body.id}/unread`);
    expect(unreadRes.status).to.equal(200);
    expect(unreadRes.body.status).to.equal('unread');
    expect(unreadRes.body.readAt).to.equal(null);
  });
});
