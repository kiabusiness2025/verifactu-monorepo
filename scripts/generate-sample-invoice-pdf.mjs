import fs from 'fs';
import { buildInvoicePdfBuffer } from '../apps/api/invoice-pdf.js';

const invoice = {
  id: 'EJEMPLO-2026-0001',
  number: 'FAC-2026-0001',
  issueDate: '2026-05-01',
  issuer: {
    name: 'EXPERT ESTUDIOS PROFESIONALES SLU',
    nif: 'B44991776',
    address: 'España',
  },
  customer: {
    name: 'Ksenia ILICHEVA',
    nif: '',
    address: 'España',
  },
  description: 'Servicio de declaracion de renta',
  tax: {
    rate: 21,
    amount: 12.6,
  },
  total: 72.6,
  verifactu_hash: '8f1e0d4d22f95e8502aabec65c7eec34a5f7fa4f3d8e2d7c4d4c0b58f42a7c10',
  verifactu_status: 'validated',
  branding: {
    primaryColor: '#2361D8',
    secondaryColor: '#0F172A',
    logoUrl: null,
  },
};

const buffer = await buildInvoicePdfBuffer(invoice);
const out = 'docs/product/examples/factura-ejemplo-verifactu-2026-05-01.pdf';
fs.writeFileSync(out, buffer);
console.log(out);
