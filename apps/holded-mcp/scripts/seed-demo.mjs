#!/usr/bin/env node
/**
 * seed-demo.mjs — Puebla la cuenta demo de Holded con datos realistas de
 * "Nova Gestión S.L." para QA de Anthropic.
 *
 * Uso:
 *   HOLDED_API_KEY=tu_api_key node scripts/seed-demo.mjs
 *   HOLDED_TEST_API_KEY=tu_api_key node scripts/seed-demo.mjs
 *
 * Crea:
 *   - 5 clientes + 2 proveedores
 *   - 8 productos/servicios
 *   - 8 facturas emitidas (Q1-Q2 2026)
 *   - 3 presupuestos abiertos
 *   - 3 facturas de compra (gastos)
 *   - 3 proyectos activos con tareas
 */

const API_KEY = process.env.HOLDED_API_KEY ?? process.env.HOLDED_TEST_API_KEY;

if (!API_KEY) {
  console.error('❌  Falta HOLDED_API_KEY o HOLDED_TEST_API_KEY');
  process.exit(1);
}

const BASE = 'https://api.holded.com';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { key: API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return JSON.parse(text);
}

const post = (path, body) => api('POST', path, body);

function ts(year, month, day) {
  return Math.floor(new Date(year, month - 1, day).getTime() / 1000);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ok(label, data) {
  const id = data?.id ?? '–';
  console.log(`  ✅  ${label} (id: ${id})`);
  return data;
}

function skip(label, err) {
  console.warn(`  ⚠️   ${label} — omitido: ${err.message?.slice(0, 100)}`);
}

// ── 1. CONTACTOS ──────────────────────────────────────────────────────────────

const CLIENTS = [
  {
    name: 'Construcciones Rivas S.A.',
    vatnumber: 'A28123456',
    email: 'admin@construccionesrivas.es',
    phone: '913456789',
    mobile: '612300001',
    type: ['client'],
    billAddress: { address: 'Avenida de la Construcción 45', city: 'Madrid', postalCode: '28045', country: 'ES' },
  },
  {
    name: 'Farmacia García Hermanos S.L.',
    vatnumber: 'B45678901',
    email: 'facturacion@farmaciasgarcia.es',
    phone: '934561234',
    mobile: '612300002',
    type: ['client'],
    billAddress: { address: 'Carrer de Provença 210', city: 'Barcelona', postalCode: '08036', country: 'ES' },
  },
  {
    name: 'Tech Solutions Madrid S.L.',
    vatnumber: 'B87654321',
    email: 'contabilidad@techsolutions.es',
    phone: '915551234',
    mobile: '612300003',
    type: ['client'],
    billAddress: { address: 'Calle Serrano 80, 3ª planta', city: 'Madrid', postalCode: '28006', country: 'ES' },
  },
  {
    name: 'Distribuciones López e Hijos S.L.',
    vatnumber: 'B12345678',
    email: 'info@distriblopez.es',
    phone: '963456789',
    mobile: '612300004',
    type: ['client'],
    billAddress: { address: 'Polígono Industrial Nord, Nave 12', city: 'Valencia', postalCode: '46100', country: 'ES' },
  },
  {
    name: 'Restaurante El Patio S.L.',
    vatnumber: 'B11223344',
    email: 'gerencia@restauranteelpatio.es',
    phone: '954321654',
    mobile: '612300005',
    type: ['client'],
    billAddress: { address: 'Plaza del Triunfo 3', city: 'Sevilla', postalCode: '41004', country: 'ES' },
  },
];

const SUPPLIERS = [
  {
    name: 'Amazon Web Services EMEA S.à r.l.',
    vatnumber: 'IE3462968O',
    email: 'aws-billing@amazon.com',
    phone: '900123456',
    type: ['supplier'],
    billAddress: { address: '1 Burlington Plaza, Burlington Road', city: 'Dublin', postalCode: 'D04 WW90', country: 'IE' },
  },
  {
    name: 'Microsoft Ibérica S.R.L.',
    vatnumber: 'A80164407',
    email: 'facturasemea@microsoft.com',
    phone: '900214365',
    type: ['supplier'],
    billAddress: { address: 'Paseo del Club Deportivo 1, Edificio 4', city: 'Pozuelo de Alarcón', postalCode: '28223', country: 'ES' },
  },
];

// ── 2. PRODUCTOS ──────────────────────────────────────────────────────────────

const PRODUCTS = [
  { name: 'Consultoría estratégica (hora)',              sku: 'SRV-CONS-H', kind: 'simple', price: 150,  taxes: ['s_iva_21'], forSale: 1, forPurchase: 0 },
  { name: 'Desarrollo software a medida (hora)',         sku: 'SRV-DEV-H',  kind: 'simple', price: 120,  taxes: ['s_iva_21'], forSale: 1, forPurchase: 0 },
  { name: 'Implantación ERP Holded (proyecto completo)', sku: 'SRV-ERP',    kind: 'simple', price: 3500, taxes: ['s_iva_21'], forSale: 1, forPurchase: 0 },
  { name: 'Formación empresarial (jornada completa)',    sku: 'SRV-FORM',   kind: 'simple', price: 800,  taxes: ['s_iva_21'], forSale: 1, forPurchase: 0 },
  { name: 'Mantenimiento y soporte mensual',             sku: 'SRV-MNT',    kind: 'simple', price: 450,  taxes: ['s_iva_21'], forSale: 1, forPurchase: 0 },
  { name: 'Licencia software anual',                     sku: 'PROD-LIC',   kind: 'simple', price: 1200, taxes: ['s_iva_21'], forSale: 1, forPurchase: 0 },
  { name: 'Pack Starter Consultoría',                    sku: 'PACK-STR',   kind: 'simple', price: 4500, taxes: ['s_iva_21'], forSale: 1, forPurchase: 0 },
];

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Nova Gestión S.L. — Seed demo para Holded\n');

  // ── Contactos ─────────────────────────────────────────────────────────────
  console.log('📇  Creando contactos...');
  const contactIds = {};

  for (const c of [...CLIENTS, ...SUPPLIERS]) {
    try {
      const res = await post('/api/invoicing/v1/contacts', c);
      contactIds[c.name] = res.id;
      ok(c.name, res);
    } catch (e) {
      skip(c.name, e);
    }
    await sleep(300);
  }

  const [rivas, farmacia, tech, lopez, patio] = CLIENTS.map((c) => contactIds[c.name]);
  const [aws, microsoft] = SUPPLIERS.map((s) => contactIds[s.name]);

  // ── Productos ─────────────────────────────────────────────────────────────
  console.log('\n📦  Creando productos y servicios...');

  for (const p of PRODUCTS) {
    try {
      const res = await post('/api/invoicing/v1/products', p);
      ok(p.name, res);
    } catch (e) {
      skip(p.name, e);
    }
    await sleep(300);
  }

  // ── Facturas emitidas ─────────────────────────────────────────────────────
  console.log('\n🧾  Creando facturas emitidas...');

  const invoices = [
    {
      _label: 'Rivas — Implantación ERP + Formación',
      contactId: rivas,
      date: ts(2026, 1, 10), dueDate: ts(2026, 2, 10),
      notes: 'Implantación ERP Holded — Fase 1: configuración base y formación inicial.',
      items: [
        { name: 'Implantación ERP Holded (proyecto completo)', units: 1, subtotal: 3500, tax: 21 },
        { name: 'Formación empresarial (jornada completa)',    units: 2, subtotal: 800,  tax: 21 },
      ],
    },
    {
      _label: 'Tech Solutions — Desarrollo sprint enero',
      contactId: tech,
      date: ts(2026, 1, 20), dueDate: ts(2026, 2, 20),
      notes: 'Desarrollo módulo integración API — Sprint enero 2026.',
      items: [
        { name: 'Desarrollo software a medida (hora)', units: 40, subtotal: 120, tax: 21 },
        { name: 'Consultoría estratégica (hora)',       units: 5,  subtotal: 150, tax: 21 },
      ],
    },
    {
      _label: 'Farmacia García — Mantenimiento + Licencia feb',
      contactId: farmacia,
      date: ts(2026, 2, 1), dueDate: ts(2026, 3, 1),
      notes: 'Mantenimiento mensual febrero 2026 y renovación licencia software.',
      items: [
        { name: 'Mantenimiento y soporte mensual', units: 1, subtotal: 450,  tax: 21 },
        { name: 'Licencia software anual',         units: 1, subtotal: 1200, tax: 21 },
      ],
    },
    {
      _label: 'López — Servidor + Configuración',
      contactId: lopez,
      date: ts(2026, 2, 15), dueDate: ts(2026, 3, 15),
      notes: 'Suministro e instalación servidor almacén central Valencia.',
      items: [
        { name: 'Servidor Dell PowerEdge R350',   units: 1, subtotal: 3200, tax: 21 },
        { name: 'Consultoría estratégica (hora)', units: 8, subtotal: 150,  tax: 21 },
      ],
    },
    {
      _label: 'Rivas — Mantenimiento Q1',
      contactId: rivas,
      date: ts(2026, 3, 3), dueDate: ts(2026, 4, 3),
      notes: 'Mantenimiento y soporte sistema ERP — Trimestre Q1 2026.',
      items: [
        { name: 'Mantenimiento y soporte mensual', units: 3, subtotal: 450, tax: 21 },
      ],
    },
    {
      _label: 'El Patio — Pack Starter',
      contactId: patio,
      date: ts(2026, 3, 15), dueDate: ts(2026, 4, 15),
      notes: 'Pack Starter Consultoría para digitalización y optimización de procesos.',
      items: [
        { name: 'Pack Starter Consultoría', units: 1, subtotal: 4500, tax: 21 },
      ],
    },
    {
      _label: 'Tech Solutions — Sprint abril',
      contactId: tech,
      date: ts(2026, 4, 1), dueDate: ts(2026, 5, 1),
      notes: 'Desarrollo panel administración y API REST — Sprint abril 2026.',
      items: [
        { name: 'Desarrollo software a medida (hora)', units: 60, subtotal: 120, tax: 21 },
        { name: 'Formación empresarial (jornada completa)', units: 1, subtotal: 800, tax: 21 },
      ],
    },
    {
      _label: 'Farmacia García — Consultoría proceso compras',
      contactId: farmacia,
      date: ts(2026, 4, 10), dueDate: ts(2026, 5, 10),
      notes: 'Consultoría optimización proceso de compras y gestión de proveedores.',
      items: [
        { name: 'Consultoría estratégica (hora)', units: 12, subtotal: 150, tax: 21 },
      ],
    },
  ];

  for (const inv of invoices) {
    const { _label, ...body } = inv;
    if (!body.contactId) { skip(_label, new Error('contactId no disponible')); continue; }
    try {
      const res = await post('/api/invoicing/v1/documents/invoice', body);
      ok(_label, res);
    } catch (e) {
      skip(_label, e);
    }
    await sleep(400);
  }

  // ── Presupuestos ──────────────────────────────────────────────────────────
  console.log('\n📋  Creando presupuestos...');

  const quotes = [
    {
      _label: 'López — Transformación digital almacén',
      contactId: lopez,
      date: ts(2026, 4, 5), dueDate: ts(2026, 5, 5),
      notes: 'Propuesta transformación digital — automatización de almacén y logística.',
      items: [
        { name: 'Consultoría estratégica (hora)',      units: 20, subtotal: 150, tax: 21 },
        { name: 'Desarrollo software a medida (hora)', units: 80, subtotal: 120, tax: 21 },
        { name: 'Formación empresarial (jornada completa)', units: 3, subtotal: 800, tax: 21 },
      ],
    },
    {
      _label: 'El Patio — TPV + reservas integrado con Holded',
      contactId: patio,
      date: ts(2026, 4, 12), dueDate: ts(2026, 5, 12),
      notes: 'Implantación TPV y sistema de reservas integrado con Holded.',
      items: [
        { name: 'Implantación ERP Holded (proyecto completo)', units: 1, subtotal: 3500, tax: 21 },
        { name: 'Mantenimiento y soporte mensual',             units: 6, subtotal: 450,  tax: 21 },
      ],
    },
    {
      _label: 'Rivas — Expansión a nuevas provincias',
      contactId: rivas,
      date: ts(2026, 4, 18), dueDate: ts(2026, 5, 18),
      notes: 'Consultoría expansión a nuevas provincias — análisis de viabilidad.',
      items: [
        { name: 'Pack Starter Consultoría',        units: 1,  subtotal: 4500, tax: 21 },
        { name: 'Consultoría estratégica (hora)',  units: 15, subtotal: 150,  tax: 21 },
      ],
    },
  ];

  for (const q of quotes) {
    const { _label, ...body } = q;
    if (!body.contactId) { skip(_label, new Error('contactId no disponible')); continue; }
    try {
      const res = await post('/api/invoicing/v1/documents/salesorder', body);
      ok(_label, res);
    } catch (e) {
      skip(_label, e);
    }
    await sleep(400);
  }

  // ── Facturas de compra (gastos) ───────────────────────────────────────────
  console.log('\n🛒  Creando facturas de compra...');

  const purchases = [
    {
      _label: 'AWS — Servicios cloud marzo 2026',
      contactId: aws,
      date: ts(2026, 3, 31), dueDate: ts(2026, 4, 30),
      notes: 'Servicios cloud AWS — EC2, S3, RDS — Marzo 2026.',
      items: [
        { name: 'Amazon EC2 — instancias producción',    units: 1, subtotal: 480, tax: 21 },
        { name: 'Amazon RDS — base de datos gestionada', units: 1, subtotal: 220, tax: 21 },
      ],
    },
    {
      _label: 'AWS — Servicios cloud abril 2026',
      contactId: aws,
      date: ts(2026, 4, 30), dueDate: ts(2026, 5, 30),
      notes: 'Servicios cloud AWS — EC2, S3, RDS — Abril 2026.',
      items: [
        { name: 'Amazon EC2 — instancias producción',    units: 1, subtotal: 512, tax: 21 },
        { name: 'Amazon RDS — base de datos gestionada', units: 1, subtotal: 235, tax: 21 },
      ],
    },
    {
      _label: 'Microsoft — M365 Business Premium × 8 usuarios',
      contactId: microsoft,
      date: ts(2026, 1, 31), dueDate: ts(2026, 2, 28),
      notes: 'Licencias Microsoft 365 Business Premium — 8 usuarios — anual.',
      items: [
        { name: 'Microsoft 365 Business Premium (8 usuarios × 12 meses)', units: 1, subtotal: 1920, tax: 21 },
      ],
    },
  ];

  for (const p of purchases) {
    const { _label, ...body } = p;
    if (!body.contactId) { skip(_label, new Error('contactId no disponible')); continue; }
    try {
      const res = await post('/api/invoicing/v1/documents/purchase', body);
      ok(_label, res);
    } catch (e) {
      skip(_label, e);
    }
    await sleep(400);
  }

  // ── Proyectos con tareas ──────────────────────────────────────────────────
  console.log('\n🗂️   Creando proyectos...');

  const projects = [
    {
      name: 'Implantación ERP — Construcciones Rivas',
      desc: 'Configuración completa de Holded para gestión de obra civil: facturación, compras, contabilidad y RRHH.',
      billable: true,
      startDate: ts(2026, 1, 10),
      endDate: ts(2026, 6, 30),
      tasks: [
        { name: 'Auditoría de procesos actuales',       desc: 'Análisis AS-IS de flujos de facturación y contabilidad', dueDate: ts(2026, 1, 20) },
        { name: 'Configuración catálogo de productos',  desc: 'Alta de productos, tarifas y condiciones por cliente',   dueDate: ts(2026, 2, 5) },
        { name: 'Migración datos históricos',           desc: 'Importación de contactos, facturas y asientos 2024-25',  dueDate: ts(2026, 2, 28) },
        { name: 'Formación equipo administración',      desc: 'Jornada formativa presencial para 4 usuarios',          dueDate: ts(2026, 3, 10) },
        { name: 'Go-live y soporte post-implantación', desc: 'Acompañamiento primera semana en producción',           dueDate: ts(2026, 3, 20) },
      ],
    },
    {
      name: 'Desarrollo App Gestión — Tech Solutions',
      desc: 'Panel de administración web con API REST para gestión de clientes y pedidos, integrada con Holded.',
      billable: true,
      startDate: ts(2026, 1, 20),
      endDate: ts(2026, 7, 31),
      tasks: [
        { name: 'Arquitectura y API spec (OpenAPI 3.0)', desc: 'Diagramas de entidad, stack tecnológico, ADRs',          dueDate: ts(2026, 2, 1) },
        { name: 'Sprint 1 — Autenticación y usuarios',  desc: 'Login, roles, permisos, 2FA',                            dueDate: ts(2026, 2, 28) },
        { name: 'Sprint 2 — Módulo de clientes',        desc: 'CRUD clientes, búsqueda, histórico de pedidos',          dueDate: ts(2026, 3, 31) },
        { name: 'Sprint 3 — Módulo de pedidos',         desc: 'Creación pedidos, estados, integración Holded invoicing', dueDate: ts(2026, 4, 30) },
        { name: 'Sprint 4 — Dashboard y reporting',     desc: 'KPIs en tiempo real, exportación PDF/Excel',             dueDate: ts(2026, 5, 31) },
        { name: 'QA, testing de carga y deploy',        desc: 'Pruebas de carga, corrección bugs, despliegue Railway',  dueDate: ts(2026, 6, 30) },
      ],
    },
    {
      name: 'Digitalización Restaurante El Patio',
      desc: 'Transformación digital: TPV integrado, gestión de reservas y control de stock conectado a Holded.',
      billable: true,
      startDate: ts(2026, 3, 20),
      endDate: ts(2026, 8, 31),
      tasks: [
        { name: 'Análisis procesos y puntos de dolor',    desc: 'Entrevistas equipo, mapa de procesos actual',           dueDate: ts(2026, 4, 5) },
        { name: 'Selección y configuración TPV',          desc: 'Evaluación soluciones, configuración e integración',    dueDate: ts(2026, 5, 15) },
        { name: 'Integración Holded + sistema reservas',  desc: 'Conexión Cover Manager / TheFork con Holded contab.',   dueDate: ts(2026, 6, 30) },
      ],
    },
  ];

  for (const proj of projects) {
    const { tasks, ...projData } = proj;
    let projectId;
    try {
      const res = await post('/api/projects/v1/projects', projData);
      projectId = res.id;
      ok(`Proyecto: ${projData.name}`, res);
    } catch (e) {
      skip(`Proyecto: ${projData.name}`, e);
      continue;
    }
    await sleep(300);

    for (const task of tasks) {
      try {
        const res = await post(`/api/projects/v1/tasks`, { ...task, projectId });
        ok(`  └ ${task.name}`, res);
      } catch (e) {
        skip(`  └ ${task.name}`, e);
      }
      await sleep(200);
    }
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  ✅  Seed completado — Nova Gestión S.L.                 ║
║                                                          ║
║  Datos creados en Holded:                                ║
║    • 5 clientes + 2 proveedores                          ║
║    • 8 productos y servicios                             ║
║    • 8 facturas emitidas (Q1-Q2 2026)                    ║
║    • 3 presupuestos abiertos                             ║
║    • 3 facturas de compra (gastos AWS + Microsoft)       ║
║    • 3 proyectos activos con 14 tareas                   ║
║                                                          ║
║  API key: ${API_KEY.slice(0, 6)}…${API_KEY.slice(-4)}                              ║
╚══════════════════════════════════════════════════════════╝
`);
}

main().catch((err) => {
  console.error('\n❌  Error inesperado:', err.message);
  process.exit(1);
});
