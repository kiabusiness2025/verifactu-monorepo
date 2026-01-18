/**
 * VeriFactu QR y Hash Generator
 * Genera códigos QR y huellas digitales según normativa AEAT
 */

const crypto = require('crypto');
const QRCode = require('qrcode');

/**
 * Calcula el hash SHA-256 de la factura para cadena VeriFactu
 * @param {Object} invoice - Datos de la factura
 * @param {string|null} previousHash - Hash de la factura anterior (null si es la primera)
 * @returns {string} Hash hexadecimal
 */
function calculateInvoiceHash(invoice, previousHash = null) {
  // Datos a incluir en el hash según normativa VeriFactu
  const dataString = [
    invoice.nif || invoice.tenant_nif,
    invoice.number,
    invoice.issueDate,
    invoice.amountNet || invoice.amount_net,
    invoice.amountTax || invoice.amount_tax,
    invoice.amountGross || invoice.amount_gross,
    previousHash || '' // Cadena de bloques
  ].join('|');

  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  return hash;
}

/**
 * Genera código QR con datos de la factura VeriFactu
 * @param {Object} invoice - Datos de la factura
 * @param {string} hash - Hash de la factura
 * @returns {Promise<string>} Imagen QR en base64
 */
async function generateInvoiceQR(invoice, hash) {
  // URL con datos VeriFactu para validación AEAT
  const qrData = {
    nif: invoice.nif || invoice.tenant_nif,
    numero: invoice.number,
    fecha: invoice.issueDate,
    importe: invoice.amountGross || invoice.amount_gross,
    hash: hash.substring(0, 16) // Primeros 16 caracteres del hash
  };

  const qrString = `https://verifactu.agenciatributaria.gob.es/verify?` +
    Object.entries(qrData).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  try {
    // Generar QR como data URL (base64)
    const qrImage = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      width: 256,
      margin: 2
    });
    return qrImage;
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw new Error('No se pudo generar el código QR');
  }
}

/**
 * Procesa factura completa: calcula hash y genera QR
 * @param {Object} invoice - Datos de la factura
 * @param {string|null} previousHash - Hash de la factura anterior
 * @returns {Promise<Object>} { hash, qr }
 */
async function processInvoiceVeriFactu(invoice, previousHash = null) {
  const hash = calculateInvoiceHash(invoice, previousHash);
  const qr = await generateInvoiceQR(invoice, hash);

  return {
    verifactu_hash: hash,
    verifactu_qr: qr,
    verifactu_status: 'pending'
  };
}

/**
 * Obtiene el último hash del tenant para continuar la cadena
 * @param {Object} db - Cliente de base de datos (Prisma/pg)
 * @param {string} tenantId - UUID del tenant
 * @returns {Promise<string|null>} Último hash o null
 */
async function getLastInvoiceHash(db, tenantId) {
  try {
    // Si es Prisma
    if (db.invoice && typeof db.invoice.findFirst === 'function') {
      const lastInvoice = await db.invoice.findFirst({
        where: { 
          tenantId,
          verifactuHash: { not: null }
        },
        orderBy: { createdAt: 'desc' },
        select: { verifactuHash: true }
      });
      return lastInvoice?.verifactuHash || null;
    }
    
    // Si es cliente PostgreSQL directo
    if (typeof db.query === 'function') {
      const result = await db.query(
        `SELECT verifactu_hash FROM invoices 
         WHERE tenant_id = $1 AND verifactu_hash IS NOT NULL 
         ORDER BY created_at DESC LIMIT 1`,
        [tenantId]
      );
      return result.rows[0]?.verifactu_hash || null;
    }

    return null;
  } catch (err) {
    console.error('Error fetching last invoice hash:', err);
    return null;
  }
}

module.exports = {
  calculateInvoiceHash,
  generateInvoiceQR,
  processInvoiceVeriFactu,
  getLastInvoiceHash
};
