import app from './index.js';
import request from 'supertest';
import { expect } from 'chai';

describe('API Tests', () => {
  it('should return a successful response from the AEAT test endpoint', (done) => {
    request(app)
      .get('/api/verifactu/test-aeat')
      .end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body.ok).to.be.true;
        done();
      });
  });
});
