const request = require('supertest');
const { expect } = require('chai');
const { createApp } = require('./index');

const app = createApp();

describe('Invoices service', () => {
  it('creates and retrieves an invoice', async () => {
    const createRes = await request(app)
      .post('/invoices')
      .send({ customerId: 'cust-1', amount: 150 });

    expect(createRes.status).to.equal(201);
    expect(createRes.body).to.include({ customerId: 'cust-1', amount: 150 });

    const fetchRes = await request(app).get(`/invoices/${createRes.body.id}`);
    expect(fetchRes.status).to.equal(200);
    expect(fetchRes.body.id).to.equal(createRes.body.id);
  });

  it('updates and deletes an invoice', async () => {
    const { body } = await request(app)
      .post('/invoices')
      .send({ customerId: 'cust-2', amount: 200, status: 'sent' });

    const updateRes = await request(app)
      .put(`/invoices/${body.id}`)
      .send({ status: 'paid' });

    expect(updateRes.status).to.equal(200);
    expect(updateRes.body.status).to.equal('paid');

    const deleteRes = await request(app).delete(`/invoices/${body.id}`);
    expect(deleteRes.status).to.equal(204);

    const missingRes = await request(app).get(`/invoices/${body.id}`);
    expect(missingRes.status).to.equal(404);
  });
});
