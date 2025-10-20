import express from "express";
import pino from "pino";
import fs from "fs";
import cors from "cors";

const log = pino();
const app = express();
app.use(express.json({ limit: "1mb" }));

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

// Healthcheck simple
 

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

// Puerto Cloud Run
const PORT = process.env.PORT || 8080;

// Solo iniciar el servidor si el script se ejecuta directamente
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => log.info(`API listening on :${PORT}`));
}

export default app;