import * as soap from 'soap';
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const log = pino();

// AEAT_WSDL_FILE puede contener:
//   - Ruta a un archivo local .wsdl  → se pasa directamente (recomendado para producción)
//   - Ruta a un .txt con una URL HTTPS → se lee la URL y se pasa con wsdl_options de cert
// AEAT requiere mTLS tanto para el SOAP como para descargar el WSDL vía HTTPS.
const WSDL_FILE = process.env.AEAT_WSDL_FILE || '/var/secrets/aeat_wsdl/wsdl_url.txt';
const CERT_PATH = process.env.AEAT_CERT_PATH || '/var/secrets/aeat_cert/cert.p12';
const PASS_FILE = process.env.AEAT_CERT_PASS_PATH || '/var/secrets/aeat_pass/cert_pass.txt';

let client = null;

async function getClient() {
  if (client) {
    return client;
  }

  try {
    const cert = fs.readFileSync(CERT_PATH);
    const password = fs.readFileSync(PASS_FILE, 'utf8').trim();

    // Leer la referencia al WSDL desde el archivo de configuración
    const wsdlRef = fs.readFileSync(WSDL_FILE, 'utf8').trim();

    // Determinar si es una ruta local a .wsdl o una URL HTTPS
    let wsdlSource;
    if (wsdlRef.startsWith('http')) {
      // URL remota — necesita el cert para el mTLS con la AEAT
      wsdlSource = wsdlRef;
    } else {
      // Ruta local: puede ser relativa (desde el directorio del proceso) o absoluta
      wsdlSource = path.isAbsolute(wsdlRef) ? wsdlRef : path.resolve(process.cwd(), wsdlRef);
    }

    const soapOptions = {
      pfx: cert,
      passphrase: password,
      // wsdl_options: opciones HTTPS para descargar el propio WSDL (mTLS AEAT)
      wsdl_options: {
        pfx: cert,
        passphrase: password,
        rejectUnauthorized: true,
      },
    };

    client = await soap.createClientAsync(wsdlSource, soapOptions);
    return client;
  } catch (error) {
    log.error('Error creating SOAP client:', error);
    throw error;
  }
}

import { invoiceToVeriFactuXML } from './verifactu-xml.js';

async function registerInvoice(invoice) {
  const client = await getClient();
  // The method name should be exactly as in the WSDL
  // I am assuming the method name is 'RegFactuSistemaFacturacion'
  const result = await client.RegFactuSistemaFacturacionAsync({
    // The request body should match the WSDL schema
    datosFactura: invoiceToVeriFactuXML(invoice),
  });
  return result;
}

async function queryInvoice(query) {
  const client = await getClient();
  // The method name should be exactly as in the WSDL
  // I am assuming the method name is 'ConsultaFactuSistemaFacturacion'
  const result = await client.ConsultaFactuSistemaFacturacionAsync({
    // The request body should match the WSDL schema
    // This is a placeholder
    datosConsulta: query,
  });
  return result;
}

function resetClient() {
  client = null;
}

export { getClient, registerInvoice, queryInvoice, resetClient };
