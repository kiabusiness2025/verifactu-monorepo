import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";

const PORT = process.env.PORT || 8080;
const app = express();

app.use(express.json());
app.use(cors({
  origin: ["https://pre.app.verifactu.business", "http://localhost:3000"],
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

// Health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "verifactu-api-stg", time: new Date().toISOString() });
});

// Stub: emitir factura demo
app.post("/invoices/demo", (req, res) => {
  const id = uuidv4();
  const number = `STG-${new Date().getFullYear()}-${Math.floor(Math.random()*10000).toString().padStart(4,"0")}`;
  const demo = {
    id,
    number,
    pdf_url: null,
    qr_url: null,
    hash: "stub-hash-" + id,
    issuer: req.body?.issuer || null,
    customer: req.body?.customer || null,
    items: req.body?.items || [],
    currency: req.body?.currency || "EUR",
    tax_rate: req.body?.tax_rate ?? 0.21
  };
  res.status(201).json(demo);
});

// Stub: validar cadena VeriFactu
app.get("/verifactu/validate/:id", (req, res) => {
  res.json({
    invoice_id: req.params.id,
    chain_ok: true,
    qr_payload: "stub-qr-payload",
    signature: "stub-signature"
  });
});

// WebSocket Isaak
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/isaak/ws" });

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "hello", from: "verifactu-api-stg", time: new Date().toISOString() }));
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", at: Date.now() }));
      } else {
        ws.send(JSON.stringify({ type: "echo", data }));
      }
    } catch {
      ws.send(JSON.stringify({ type: "echo-text", data: msg.toString() }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});
