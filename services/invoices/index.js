const express = require('express');

function createApp() {
  const app = express();
  app.use(express.json());

  const invoices = new Map();
  let nextId = 1;

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/invoices', (req, res) => {
    const all = Array.from(invoices.values());
    if (req.query.customerId) {
      return res.json(all.filter((inv) => String(inv.customerId) === String(req.query.customerId)));
    }
    res.json(all);
  });

  app.post('/invoices', (req, res) => {
    const { customerId, amount, status = 'draft', currency = 'EUR', dueDate, metadata = {} } = req.body || {};
    if (!customerId || amount == null) {
      return res.status(400).json({ error: 'customerId and amount are required' });
    }

    const id = nextId++;
    const invoice = {
      id,
      customerId,
      amount,
      currency,
      status,
      dueDate: dueDate || null,
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    invoices.set(id, invoice);
    res.status(201).json(invoice);
  });

  app.get('/invoices/:id', (req, res) => {
    const invoice = invoices.get(Number(req.params.id));
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  });

  app.put('/invoices/:id', (req, res) => {
    const id = Number(req.params.id);
    const existing = invoices.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updates = req.body || {};
    const updatedInvoice = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    invoices.set(id, updatedInvoice);
    res.json(updatedInvoice);
  });

  app.delete('/invoices/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!invoices.has(id)) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    invoices.delete(id);
    res.status(204).send();
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 4001;
  app.listen(port, () => {
    console.log(`Invoices service listening on port ${port}`);
  });
}

module.exports = { createApp };
