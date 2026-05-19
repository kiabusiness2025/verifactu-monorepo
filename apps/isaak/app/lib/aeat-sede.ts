import https from 'https';
import { prisma } from '@/app/lib/prisma';
import { decryptCert } from './certificate-crypto';

// ── Certificate loading ───────────────────────────────────────────────────────

type CertPemPair = { certPem: string; keyPem: string; nif: string; commonName: string };

export async function loadTenantCertPem(tenantId: string): Promise<CertPemPair | null> {
  const row = await prisma.tenantCertificate.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: {
      encryptedP12: true,
      iv: true,
      authTag: true,
      nif: true,
      commonName: true,
    },
  });
  if (!row) return null;

  const buf = decryptCert(row.encryptedP12, row.iv, row.authTag);
  const parsed = JSON.parse(buf.toString('utf8')) as { cert?: string; key?: string };
  if (!parsed.cert || !parsed.key) return null;

  return { certPem: parsed.cert, keyPem: parsed.key, nif: row.nif, commonName: row.commonName };
}

function buildAgent(certPem: string, keyPem: string): https.Agent {
  return new https.Agent({ cert: certPem, key: keyPem, rejectUnauthorized: true });
}

// ── Raw SOAP helper ───────────────────────────────────────────────────────────

function httpsPost(
  url: string,
  soapAction: string,
  body: string,
  agent: https.Agent
): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>${body}</soapenv:Body>
</soapenv:Envelope>`;

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyBuf = Buffer.from(envelope, 'utf8');
    const req = https.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: `"${soapAction}"`,
          'Content-Length': bodyBuf.length,
        },
        agent,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }
    );
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

// ── Simple XML value extractor ─────────────────────────────────────────────────

function extractXmlValues(xml: string, tag: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`<[^:>]*:?${tag}[^>]*>([^<]*)</[^:>]*:?${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

function extractXmlBlocks(xml: string, tag: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`<[^:>]*:?${tag}[^>]*>([\\s\\S]*?)</[^:>]*:?${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1]);
  return results;
}

// ── AEAT Notificaciones (Buzón Electrónico) ───────────────────────────────────

const AEAT_NOTIF_URL =
  process.env.AEAT_NOTIF_WS_URL ??
  'https://www1.agenciatributaria.gob.es/wlpl/BUZA-CONT/ws/BuzElecWS';

export type AeatNotification = {
  id: string;
  title: string;
  emisor: string;
  fecha: string;
  estado: 'pendiente' | 'leida' | 'expirada';
  tipo: string;
};

export async function getAeatNotifications(
  tenantId: string
): Promise<{ ok: boolean; notifications: AeatNotification[]; error?: string }> {
  const cert = await loadTenantCertPem(tenantId);
  if (!cert) return { ok: false, notifications: [], error: 'no_cert' };

  const agent = buildAgent(cert.certPem, cert.keyPem);
  const requestBody = `<buz:ConsultarNotificaciones xmlns:buz="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/informatica/es/desarrollo/proyecto_tramitacion/doc/BUZA_CONT.WSDL">
    <buz:NIF>${cert.nif}</buz:NIF>
  </buz:ConsultarNotificaciones>`;

  let xml: string;
  try {
    xml = await httpsPost(AEAT_NOTIF_URL, 'ConsultarNotificaciones', requestBody, agent);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, notifications: [], error: `soap_error: ${msg}` };
  }

  if (xml.includes('faultstring') || xml.includes('Fault')) {
    const fault = extractXmlValues(xml, 'faultstring')[0] ?? 'SOAP Fault';
    return { ok: false, notifications: [], error: fault };
  }

  const blocks = extractXmlBlocks(xml, 'Notificacion');
  const notifications: AeatNotification[] = blocks.map((block) => {
    const estadoRaw = (extractXmlValues(block, 'Estado')[0] ?? '').toLowerCase();
    const estado: AeatNotification['estado'] = estadoRaw.includes('pendiente')
      ? 'pendiente'
      : estadoRaw.includes('expir')
        ? 'expirada'
        : 'leida';
    return {
      id: extractXmlValues(block, 'IdNotificacion')[0] ?? extractXmlValues(block, 'Id')[0] ?? '',
      title:
        extractXmlValues(block, 'Descripcion')[0] ??
        extractXmlValues(block, 'Titulo')[0] ??
        'Sin título',
      emisor: extractXmlValues(block, 'Emisor')[0] ?? 'AEAT',
      fecha:
        extractXmlValues(block, 'FechaEmision')[0] ?? extractXmlValues(block, 'Fecha')[0] ?? '',
      estado,
      tipo: extractXmlValues(block, 'TipoNotificacion')[0] ?? 'Notificación',
    };
  });

  return { ok: true, notifications };
}

// ── AEAT Datos Censales ───────────────────────────────────────────────────────

const AEAT_CENSUS_URL =
  process.env.AEAT_CENSUS_WS_URL ??
  'https://www1.agenciatributaria.gob.es/wlpl/OVSC-CONT/ws/ConsultaInformacion/ConsultaInformacion';

export type AeatCensusData = {
  nif: string;
  nombre: string;
  domicilioFiscal?: string;
  municipio?: string;
  provincia?: string;
  epigrafesIAE?: string[];
  situacionCensal?: string;
};

export async function getAeatCensusData(
  tenantId: string
): Promise<{ ok: boolean; data?: AeatCensusData; error?: string }> {
  const cert = await loadTenantCertPem(tenantId);
  if (!cert) return { ok: false, error: 'no_cert' };

  const agent = buildAgent(cert.certPem, cert.keyPem);
  const requestBody = `<con:ConsultaInformacion xmlns:con="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/informatica/es/desarrollo/proyecto_tramitacion/doc/OVSC_CONT.WSDL">
    <con:NIF>${cert.nif}</con:NIF>
  </con:ConsultaInformacion>`;

  let xml: string;
  try {
    xml = await httpsPost(AEAT_CENSUS_URL, 'ConsultaInformacion', requestBody, agent);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `soap_error: ${msg}` };
  }

  if (xml.includes('faultstring') || xml.includes('Fault')) {
    const fault = extractXmlValues(xml, 'faultstring')[0] ?? 'SOAP Fault';
    return { ok: false, error: fault };
  }

  const data: AeatCensusData = {
    nif: cert.nif,
    nombre:
      extractXmlValues(xml, 'NombreRazonSocial')[0] ??
      extractXmlValues(xml, 'Nombre')[0] ??
      cert.commonName,
    domicilioFiscal:
      extractXmlValues(xml, 'DomicilioFiscal')[0] ?? extractXmlValues(xml, 'DireccionFiscal')[0],
    municipio: extractXmlValues(xml, 'Municipio')[0] ?? extractXmlValues(xml, 'Localidad')[0],
    provincia: extractXmlValues(xml, 'Provincia')[0],
    epigrafesIAE: extractXmlValues(xml, 'EpigrafeIAE').filter(Boolean),
    situacionCensal: extractXmlValues(xml, 'SituacionCensal')[0],
  };

  return { ok: true, data };
}
