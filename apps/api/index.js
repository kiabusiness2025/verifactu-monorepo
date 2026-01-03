import express from "express";
import pino from "pino";
import fs from "fs";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerInvoice } from "./soap-client.js";

const log = pino();
const app = express();
app.use(express.json({ limit: "1mb" }));

// Limiter robusto
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});
app.use("/api", limiter);

// --- Security headers (básicos) ---
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // CSP mínima; ajusta si sirves assets externos:
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'");
  next();
});

// --- CORS con paquete 'cors' ---
const ALLOWED_ORIGINS = [
  "https://pre.app.verifactu.business",
  "https://app.verifactu.business",
  "https://verifactu.business",
  // TODO: Considerar añadir aquí la URL específica de Cloud Run si es necesaria,
  // en lugar de permitir cualquier subdominio '.run.app' por seguridad.
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Rutas de secretos montados como archivos
const CERT_PATH = process.env.AEAT_CERT_PATH || "/var/secrets/aeat_cert/cert.p12";
const PASS_FILE = process.env.AEAT_CERT_PASS_PATH || "/var/secrets/aeat_pass/cert_pass.txt";
const WSDL_FILE = process.env.AEAT_WSDL_FILE || "/var/secrets/aeat_wsdl/wsdl_url.txt";

app.get("/api/healthz", (_req, res) => res.status(200).send("ok"));

function buildEmptyDashboardSummary(extra = {}) {
  return {
    totals: { sales: 0, expenses: 0, profit: 0 },
    activity: [],
    deadlines: [],
    ...extra,
  };
}

app.get("/api/dashboard/summary", (req, res) => {
  try {
    const period = String(req.query.period || "").trim();
    if (period !== "this_month") {
      return res
        .status(400)
        .json(buildEmptyDashboardSummary({ error: "Invalid period. Use period=this_month" }));
    }

    // Backend actual: no hay facturas/gastos persistidos disponibles para calcular totales reales.
    // Devolvemos contrato estable con ceros y arrays vacíos.
    return res.status(200).json(buildEmptyDashboardSummary());
  } catch (e) {
    log.error(e);
    return res
      .status(500)
      .json(buildEmptyDashboardSummary({ error: e?.message || "Unexpected error" }));
  }
});

// Inspección (mínima) para validar que los secretos están accesibles
app.get("/api/verifactu/ops", (_req, res) => {
  try {
    const certExists = fs.existsSync(CERT_PATH);
    const pass = fs.existsSync(PASS_FILE) ? fs.readFileSync(PASS_FILE, "utf8") : null;
    const wsdlUrl = fs.existsSync(WSDL_FILE) ? fs.readFileSync(WSDL_FILE, "utf8") : null;

    const operations = [
      { service: "sfVerifactu", port: "SistemaVerifactu", operation: "RegFactuSistemaFacturacion" },
      { service: "sfVerifactu", port: "SistemaVerifactu", operation: "ConsultaFactuSistemaFacturacion" }
    ];

    return res.json({
      ok: true,
      certPath: CERT_PATH,
      certFound: certExists,
      passLength: pass ? pass.trim().length : 0,
      wsdlUrl: wsdlUrl ? wsdlUrl.trim() : null,
      operations
    });
  } catch (e) {
    log.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/verifactu/register-invoice", async (req, res) => {
  try {
    const invoice = {
      id: "F2023-0001",
      number: "F2023-0001",
      issueDate: new Date().toISOString(),
      total: 121,
      tax: {
        rate: 0.21,
        amount: 21,
      },
      customer: {
        name: "Cliente de Prueba",
        nif: "12345678Z",
      },
      issuer: {
        name: "Mi Empresa",
        nif: "A12345678",
      },
    };
    const result = await registerInvoice(invoice);
    res.json({ ok: true, data: result });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Puerto Cloud Run
const PORT = process.env.PORT || 8080;

// Solo iniciar el servidor si el script se ejecuta directamente
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => log.info(`API listening on :${PORT}`));
}

export default app;
