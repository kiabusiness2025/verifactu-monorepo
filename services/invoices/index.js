import express from "express";
import pino from "pino";

const log = pino();
const app = express();
app.use(express.json());

// In-memory store for invoices (for demonstration purposes)
const invoices = new Map();
let invoiceCounter = 1;

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "invoices" });
});

// Get all invoices
app.get("/invoices", (_req, res) => {
  try {
    const allInvoices = Array.from(invoices.values());
    res.json({ ok: true, data: allInvoices, count: allInvoices.length });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get invoice by ID
app.get("/invoices/:id", (req, res) => {
  try {
    const { id } = req.params;
    const invoice = invoices.get(id);
    
    if (!invoice) {
      return res.status(404).json({ ok: false, error: "Invoice not found" });
    }
    
    res.json({ ok: true, data: invoice });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Create new invoice
app.post("/invoices", (req, res) => {
  try {
    const invoiceData = req.body;
    
    if (!invoiceData) {
      return res.status(400).json({ ok: false, error: "Missing invoice data" });
    }
    
    const id = `INV-${invoiceCounter++}`;
    const invoice = {
      id,
      ...invoiceData,
      createdAt: new Date().toISOString(),
      status: invoiceData.status || "pending"
    };
    
    invoices.set(id, invoice);
    log.info({ invoiceId: id }, "Invoice created");
    
    res.status(201).json({ ok: true, data: invoice });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Update invoice
app.put("/invoices/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!invoices.has(id)) {
      return res.status(404).json({ ok: false, error: "Invoice not found" });
    }
    
    const existingInvoice = invoices.get(id);
    const updatedInvoice = {
      ...existingInvoice,
      ...updateData,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };
    
    invoices.set(id, updatedInvoice);
    log.info({ invoiceId: id }, "Invoice updated");
    
    res.json({ ok: true, data: updatedInvoice });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Delete invoice
app.delete("/invoices/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    if (!invoices.has(id)) {
      return res.status(404).json({ ok: false, error: "Invoice not found" });
    }
    
    invoices.delete(id);
    log.info({ invoiceId: id }, "Invoice deleted");
    
    res.json({ ok: true, message: "Invoice deleted successfully" });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 8081;

// Only start the server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => log.info(`Invoices service listening on :${PORT}`));
}

export default app;
