import { registerInvoice } from '../apps/api/soap-client.js';

const invoice = {
  id: 'BORRADOR-20260501-001',
  number: 'BORRADOR-20260501-001',
  issueDate: '01-05-2026',
  total: 72.6,
  tax: { rate: 21.0, amount: 12.6 },
  description:
    'Servicio de declaracion de renta. Emisor: EXPERT ESTUDIOS PROFESIONALES SLU (B44991776), C/Pintor Agrassot, 19 - 03110 Mutxamel (Alicante). Destinataria: Ksenia ILICHEVA (NIE X3576519L), C/Pintor Agrassot, 19 - 03110 Mutxamel (Alicante).',
  customer: {
    name: 'Ksenia ILICHEVA',
    nif: 'X3576519L',
  },
  issuer: {
    name: 'Expert Estudios Profesionales, SLU',
    nif: 'B44991776',
  },
  verifactu_hash: 'TESTHASH1234567890',
  verifactu_qr: null,
};

async function main() {
  console.log('Iniciando prueba de registro VeriFactu en AEAT (entorno configurado)...');
  try {
    const result = await registerInvoice(invoice);
    console.log('Respuesta AEAT:');
    console.dir(result, { depth: 8 });
  } catch (error) {
    console.error('Error en prueba de emision:');
    console.error(error?.message || error);
    if (error?.response?.body) {
      console.error('SOAP body:');
      console.error(error.response.body);
    }
    process.exitCode = 1;
  }
}

main();
