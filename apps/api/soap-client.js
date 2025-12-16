import soap from "soap";
import fs from "fs";
import pino from "pino";

const log = pino();

const WSDL_FILE = process.env.AEAT_WSDL_FILE || "/var/secrets/aeat_wsdl/wsdl_url.txt";
const CERT_PATH = process.env.AEAT_CERT_PATH || "/var/secrets/aeat_cert/cert.p12";
const PASS_FILE = process.env.AEAT_CERT_PASS_PATH || "/var/secrets/aeat_pass/cert_pass.txt";

let client = null;

async function getClient() {
  if (client) {
    return client;
  }

  try {
    const wsdlUrl = fs.readFileSync(WSDL_FILE, "utf8").trim();
    const cert = fs.readFileSync(CERT_PATH);
    const password = fs.readFileSync(PASS_FILE, "utf8").trim();

    const soapOptions = {
      pfx: cert,
      passphrase: password,
    };

    client = await soap.createClientAsync(wsdlUrl, { soapOptions });
    return client;
  } catch (error) {
    log.error("Error creating SOAP client:", error);
    throw error;
  }
}

import { invoiceToVeriFactuXML } from "./verifactu-xml.js";

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

