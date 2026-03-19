const apiKey = process.env.HOLDED_TEST_API_KEY?.trim() || process.env.HOLDED_API_KEY?.trim();
const baseUrl = (process.env.HOLDED_API_BASE_URL || 'https://api.holded.com').trim();
const dryRun = process.env.DRY_RUN === '1';

if (!apiKey) {
  console.error('HOLDED_TEST_API_KEY or HOLDED_API_KEY is required');
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

async function listContacts() {
  const data = await holdedFetch('/api/invoicing/v1/contacts?limit=200&page=1');
  return Array.isArray(data) ? data : [];
}

async function ensureContact(contact) {
  const existing = (await listContacts()).find((item) => item?.code === contact.code || item?.name === contact.name);
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

async function createDraft(contactMap, draft) {
  const contact = contactMap.get(draft.contactCode);
  if (!contact?.id) {
    throw new Error(`Contact not found for ${draft.contactCode}`);
  }

  const payload = {
    contactId: contact.id,
    subject: draft.subject,
    notes: 'Seed demo data for Isaak for Holded',
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
  console.log(`Dry run: ${dryRun ? 'yes' : 'no'}`);

  const contactMap = new Map();
  for (const contact of contacts) {
    const saved = await ensureContact(contact);
    contactMap.set(contact.code, saved);
  }

  for (const draft of invoiceDrafts) {
    await createDraft(contactMap, draft);
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
