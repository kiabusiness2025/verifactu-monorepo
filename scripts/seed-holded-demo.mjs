import { loadHoldedEnvConfig } from './holded-env.mjs';

const envConfig = loadHoldedEnvConfig(process.cwd());
const apiKey = envConfig.apiKey;
const baseUrl = envConfig.baseUrl;
const dryRun = process.env.DRY_RUN === '1';

if (!apiKey) {
  console.error(
    'Missing HOLDED_TEST_API_KEY or HOLDED_API_KEY. Checked process.env and apps/holded/.env.local.'
  );
  process.exit(1);
}

const contacts = [
  { name: 'Demo Retail Norte SL', code: 'DEMO-001', email: 'compras@retailnorte.demo' },
  { name: 'Servicios Delta Tech SL', code: 'DEMO-002', email: 'admin@deltatech.demo' },
  { name: 'Construcciones Bahía 2030 SL', code: 'DEMO-003', email: 'oficina@bahiademo.demo' },
  { name: 'Clínica Horizonte Madrid', code: 'DEMO-004', email: 'direccion@horizonte.demo' },
  { name: 'Logística Atlas Demo SL', code: 'DEMO-005', email: 'ops@atlasdemo.demo' },
  { name: 'Studio Naranja Creative SL', code: 'DEMO-006', email: 'hello@studionaranja.demo' },
];

const groups = [
  {
    name: 'Clientes recurrentes',
    desc: 'Clientes de la demo con operaciones activas',
    color: '#2F855A',
  },
  {
    name: 'Prospects asesoría',
    desc: 'Contactos todavía en fase comercial',
    color: '#C05621',
  },
];

const products = [
  {
    name: 'Pack asesoría fiscal mensual',
    desc: 'Producto demo para facturación recurrente',
    sku: 'DEMO-PROD-001',
    barcode: '8412345678901',
    price: 340,
    tax: 21,
  },
  {
    name: 'Migración inicial de datos',
    desc: 'Producto demo para implantación y arranque',
    sku: 'DEMO-PROD-002',
    barcode: '8412345678902',
    price: 890,
    tax: 21,
  },
];

const services = [
  {
    name: 'Revisión de tesorería',
    desc: 'Servicio demo orientado a liquidez y previsión',
    subtotal: 620,
    tax: 21,
    cost: 180,
  },
  {
    name: 'Acompañamiento de cierre mensual',
    desc: 'Servicio demo para reporting y seguimiento operativo',
    subtotal: 450,
    tax: 21,
    cost: 120,
  },
];

const invoiceDrafts = [
  {
    contactCode: 'DEMO-001',
    docType: 'invoice',
    subject: 'Cuota mensual de asesoría fiscal',
    desc: 'Servicio mensual de soporte fiscal y reporting operativo',
    units: 1,
    price: 340,
  },
  {
    contactCode: 'DEMO-002',
    docType: 'invoice',
    subject: 'Implantación de cuadro de mando',
    desc: 'Configuración inicial y revisión del flujo de ventas/gastos',
    units: 1,
    price: 890,
  },
  {
    contactCode: 'DEMO-004',
    docType: 'estimate',
    subject: 'Borrador de mejora de tesorería',
    desc: 'Propuesta de acompañamiento para previsión de caja y margen',
    units: 1,
    price: 620,
  },
];

async function holdedFetch(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      key: apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    const detail = data?.error || data?.message || text || `HTTP ${response.status}`;
    throw new Error(`${method} ${path} failed: ${detail}`);
  }

  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  const candidates = [data.data, data.items, data.results, data.rows, data.documents];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

async function listContacts() {
  const data = await holdedFetch('/api/invoicing/v1/contacts?limit=200&page=1');
  return asArray(data);
}

async function listContactGroups() {
  const data = await holdedFetch('/api/invoicing/v1/contacts/groups?limit=200&page=1');
  return asArray(data);
}

async function listProducts() {
  const data = await holdedFetch('/api/invoicing/v1/products?limit=200&page=1');
  return asArray(data);
}

async function listServices() {
  const data = await holdedFetch('/api/invoicing/v1/services?limit=200&page=1');
  return asArray(data);
}

async function listDocumentsByType(docType) {
  const data = await holdedFetch(`/api/invoicing/v1/documents/${docType}?limit=200&page=1`);
  return asArray(data);
}

async function ensureContact(contact) {
  const existing = (await listContacts()).find(
    (item) => item?.code === contact.code || item?.name === contact.name
  );
  if (existing) {
    console.log(`= Contact already present: ${contact.name}`);
    return existing;
  }

  if (dryRun) {
    console.log(`~ Would create contact: ${contact.name}`);
    return { id: `dry-${contact.code}`, ...contact };
  }

  const created = await holdedFetch('/api/invoicing/v1/contacts', {
    method: 'POST',
    body: {
      name: contact.name,
      code: contact.code,
      email: contact.email,
      type: 'client',
    },
  });

  console.log(`+ Contact created: ${contact.name}`);
  return created;
}

async function ensureContactGroup(group) {
  const existing = (await listContactGroups()).find((item) => item?.name === group.name);
  if (existing) {
    console.log(`= Contact group already present: ${group.name}`);
    return existing;
  }

  if (dryRun) {
    console.log(`~ Would create contact group: ${group.name}`);
    return { id: `dry-group-${group.name}`, ...group };
  }

  const created = await holdedFetch('/api/invoicing/v1/contacts/groups', {
    method: 'POST',
    body: group,
  });

  console.log(`+ Contact group created: ${group.name}`);
  return created;
}

async function ensureProduct(product) {
  const existing = (await listProducts()).find(
    (item) => item?.sku === product.sku || item?.name === product.name
  );
  if (existing) {
    console.log(`= Product already present: ${product.name}`);
    return existing;
  }

  if (dryRun) {
    console.log(`~ Would create product: ${product.name}`);
    return { id: `dry-product-${product.sku}`, ...product };
  }

  const created = await holdedFetch('/api/invoicing/v1/products', {
    method: 'POST',
    body: {
      kind: 'simple',
      name: product.name,
      desc: product.desc,
      price: product.price,
      tax: product.tax,
      sku: product.sku,
      barcode: product.barcode,
    },
  });

  console.log(`+ Product created: ${product.name}`);
  return created;
}

async function ensureService(service) {
  const existing = (await listServices()).find((item) => item?.name === service.name);
  if (existing) {
    console.log(`= Service already present: ${service.name}`);
    return existing;
  }

  if (dryRun) {
    console.log(`~ Would create service: ${service.name}`);
    return { id: `dry-service-${service.name}`, ...service };
  }

  const created = await holdedFetch('/api/invoicing/v1/services', {
    method: 'POST',
    body: service,
  });

  console.log(`+ Service created: ${service.name}`);
  return created;
}

async function ensureDraft(contactMap, draft) {
  const contact = contactMap.get(draft.contactCode);
  if (!contact?.id) {
    throw new Error(`Contact not found for ${draft.contactCode}`);
  }

  const existing = (await listDocumentsByType(draft.docType)).find(
    (item) =>
      (item?.contact === contact.id || item?.contactId === contact.id) &&
      typeof item?.notes === 'string' &&
      item.notes.includes('Seed demo data for Isaak for Holded')
  );
  if (existing) {
    console.log(`= Draft already present: ${draft.subject}`);
    return;
  }

  const payload = {
    contactId: contact.id,
    date: unixNow(),
    subject: draft.subject,
    notes: `Seed demo data for Isaak for Holded | ${draft.subject}`,
    lines: [
      {
        desc: draft.desc,
        units: draft.units,
        price: draft.price,
        tax: 21,
      },
    ],
  };

  if (dryRun) {
    console.log(`~ Would create ${draft.docType}: ${draft.subject}`);
    return;
  }

  await holdedFetch(`/api/invoicing/v1/documents/${draft.docType}`, {
    method: 'POST',
    body: payload,
  });

  console.log(`+ Draft created: ${draft.subject}`);
}

async function main() {
  console.log('Seeding Holded demo data...');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`API key source: ${envConfig.source}`);
  console.log(`Dry run: ${dryRun ? 'yes' : 'no'}`);

  const contactMap = new Map();
  for (const contact of contacts) {
    const saved = await ensureContact(contact);
    contactMap.set(contact.code, saved);
  }

  for (const group of groups) {
    await ensureContactGroup(group);
  }

  for (const product of products) {
    await ensureProduct(product);
  }

  for (const service of services) {
    await ensureService(service);
  }

  for (const draft of invoiceDrafts) {
    await ensureDraft(contactMap, draft);
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
