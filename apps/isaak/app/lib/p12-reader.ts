import forge from 'node-forge';

export type CertInfo = {
  commonName: string;
  nif: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  certType: 'persona_fisica' | 'entidad';
};

function extractAttr(subject: forge.pki.CertificateField[], shortName: string): string {
  const val = subject.find((a) => a.shortName === shortName || a.name === shortName)?.value;
  return typeof val === 'string' ? val : '';
}

function extractNifFromSubject(subject: forge.pki.CertificateField[]): string {
  // FNMT embeds NIF in serialNumber or OID 2.5.4.5
  const serial = extractAttr(subject, 'serialNumber');
  if (serial) {
    // FNMT format: "IDCES-X1234567A" or "X1234567A"
    const match = serial.match(/(?:IDCES-)?([A-Z0-9]{8,9})/i);
    if (match) return match[1].toUpperCase();
  }
  // Try CN: "APELLIDO NOMBRE - X1234567A"
  const cn = extractAttr(subject, 'CN');
  const cnMatch = cn.match(/[-–]\s*([A-Z0-9]{8,9})$/i);
  if (cnMatch) return cnMatch[1].toUpperCase();
  return '';
}

function isCertEntity(subject: forge.pki.CertificateField[]): boolean {
  const ou = extractAttr(subject, 'OU').toLowerCase();
  const cn = extractAttr(subject, 'CN').toLowerCase();
  // Empresa/entidad certs usually mention "persona juridica" or "entidad"
  return (
    ou.includes('juridica') || ou.includes('entidad') || cn.includes('s.l') || cn.includes('s.a')
  );
}

export type CertPem = { certPem: string; keyPem: string };

export function extractPemFromP12(p12Buffer: Buffer, password: string): CertPem {
  const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  // Extract certificate
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;
  if (!cert) throw new Error('Certificado no encontrado en el P12');
  const certPem = forge.pki.certificateToPem(cert);

  // Extract private key (shrouded or plain)
  let privateKey: forge.pki.rsa.PrivateKey | null = null;
  const shroudedBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const shrouded = shroudedBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  if (shrouded?.key) {
    privateKey = shrouded.key as forge.pki.rsa.PrivateKey;
  } else {
    const keyBags = p12.getBags({ bagType: forge.pki.oids.keyBag });
    const plain = keyBags[forge.pki.oids.keyBag]?.[0];
    if (plain?.key) privateKey = plain.key as forge.pki.rsa.PrivateKey;
  }
  if (!privateKey) throw new Error('Clave privada no encontrada en el P12');
  const keyPem = forge.pki.privateKeyToPem(privateKey);

  return { certPem, keyPem };
}

export function readP12(p12Buffer: Buffer, password: string): CertInfo {
  const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const bags = certBags[forge.pki.oids.certBag];
  if (!bags || bags.length === 0) throw new Error('No se encontraron certificados en el P12');

  const cert = bags[0].cert;
  if (!cert) throw new Error('Certificado no válido');

  const subject = cert.subject.attributes;
  const issuerAttrs = cert.issuer.attributes;

  const commonName = extractAttr(subject, 'CN') || extractAttr(subject, 'commonName');
  const nif = extractNifFromSubject(subject);
  const issuerO = extractAttr(issuerAttrs, 'O') || extractAttr(issuerAttrs, 'organizationName');
  const certType = isCertEntity(subject) ? 'entidad' : 'persona_fisica';

  return {
    commonName,
    nif,
    issuer: issuerO || 'Desconocido',
    validFrom: cert.validity.notBefore,
    validTo: cert.validity.notAfter,
    certType,
  };
}
