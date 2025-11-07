# Verifactu API – Staging (verifactu-pre)

Endpoints:
- GET /health
- POST /invoices/demo
- GET /verifactu/validate/:id
- WS /isaak/ws

Despliegue rápido:
- Cloud Run (europe-west1) con domain mapping `api-pre.verifactu.business`.

Verificación:
- `curl -sS https://api-pre.verifactu.business/health`
- `npx wscat -c wss://api-pre.verifactu.business/isaak/ws` y enviar `{"type":"ping"}`