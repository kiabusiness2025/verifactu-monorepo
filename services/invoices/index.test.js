import app from './index.js';
import request from 'supertest';

describe('Invoices Service', () => {
  it('should return health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe('invoices');
  });

  it('should create a new invoice', async () => {
    const invoiceData = {
      clientName: 'Test Client',
      amount: 100.50,
      description: 'Test invoice'
    };
    
    const res = await request(app)
      .post('/invoices')
      .send(invoiceData);
    
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.clientName).toBe(invoiceData.clientName);
    expect(res.body.data.amount).toBe(invoiceData.amount);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('pending');
  });

  it('should get all invoices', async () => {
    const res = await request(app).get('/invoices');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get invoice by ID', async () => {
    // First create an invoice
    const createRes = await request(app)
      .post('/invoices')
      .send({ clientName: 'Test', amount: 50 });
    
    const invoiceId = createRes.body.data.id;
    
    // Then get it by ID
    const res = await request(app).get(`/invoices/${invoiceId}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBe(invoiceId);
  });

  it('should return 404 for non-existent invoice', async () => {
    const res = await request(app).get('/invoices/NON-EXISTENT');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it('should update an invoice', async () => {
    // First create an invoice
    const createRes = await request(app)
      .post('/invoices')
      .send({ clientName: 'Test', amount: 75 });
    
    const invoiceId = createRes.body.data.id;
    
    // Then update it
    const res = await request(app)
      .put(`/invoices/${invoiceId}`)
      .send({ status: 'paid', amount: 80 });
    
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('paid');
    expect(res.body.data.amount).toBe(80);
  });

  it('should delete an invoice', async () => {
    // First create an invoice
    const createRes = await request(app)
      .post('/invoices')
      .send({ clientName: 'Test', amount: 100 });
    
    const invoiceId = createRes.body.data.id;
    
    // Then delete it
    const res = await request(app).delete(`/invoices/${invoiceId}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    
    // Verify it's deleted
    const getRes = await request(app).get(`/invoices/${invoiceId}`);
    expect(getRes.status).toBe(404);
  });
});
