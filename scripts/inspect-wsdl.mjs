import { getClient } from '../apps/api/soap-client.js';

const client = await getClient();
const description = client.describe();

const op =
  description?.sfVerifactu?.SistemaVerifactu?.RegFactuSistemaFacturacion ||
  description?.sfVerifactu?.SistemaVerifactuPruebas?.RegFactuSistemaFacturacion ||
  description?.sfVerifactu?.SistemaVerifactuSelloPruebas?.RegFactuSistemaFacturacion ||
  description;

console.log(JSON.stringify(op, null, 2));
