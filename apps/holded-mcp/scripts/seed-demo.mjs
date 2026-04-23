/**
 * Seed script: crea datos dummy realistas para "Nova Gestión" en Holded.
 * Uso: node apps/holded-mcp/scripts/seed-demo.mjs
 */

const API_KEY = process.env.HOLDED_DEMO_API_KEY ?? '';
if (!API_KEY) { console.error('Falta HOLDED_DEMO_API_KEY'); process.exit(1); }
const BASE = 'https://api.holded.com';

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { key: API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    console.error(`  ✗ ${method} ${path} → ${res.status}:`, JSON.stringify(json).slice(0, 200));
    return null;
  }
  return json;
}

// ── Contactos ────────────────────────────────────────────────────────────────

const contacts = [
  {
    name: 'Construcciones Martínez S.L.',
    vatnumber: 'B12345678',
    email: 'admin@construcciones-martinez.es',
    phone: '+34 93 234 56 78',
    type: 'client',
    address: 'Calle Gran Vía 42, 08001 Barcelona',
    city: 'Barcelona',
    cp: '08001',
    country: 'ES',
    notes: 'Cliente desde 2022. Sector construcción y reforma.',
  },
  {
    name: 'Tech Solutions Barcelona S.L.U.',
    vatnumber: 'B87654321',
    email: 'facturacion@techsolutions.es',
    phone: '+34 93 456 78 90',
    type: 'client',
    address: 'Passeig de Gràcia 100, 08008 Barcelona',
    city: 'Barcelona',
    cp: '08008',
    country: 'ES',
    notes: 'Startup tecnológica. Pago a 30 días.',
  },
  {
    name: 'Distribuciones García e Hijos S.A.',
    vatnumber: 'A23456789',
    email: 'compras@garcia-hijos.es',
    phone: '+34 91 345 67 89',
    type: 'client',
    address: 'Calle Alcalá 200, 28009 Madrid',
    city: 'Madrid',
    cp: '28009',
    country: 'ES',
    notes: 'Empresa distribución. Facturación mensual recurrente.',
  },
  {
    name: 'Suministros Oficina Rápida S.L.',
    vatnumber: 'B34567890',
    email: 'pedidos@oficinarapida.es',
    phone: '+34 93 111 22 33',
    type: 'supplier',
    address: 'Polígono Industrial Can Sugranyes, Nave 7, 08820 El Prat de Llobregat',
    city: 'El Prat de Llobregat',
    cp: '08820',
    country: 'ES',
    notes: 'Proveedor de material de oficina.',
  },
  {
    name: 'Gestoría Pérez & Asociados',
    vatnumber: 'B45678901',
    email: 'gestoria@perezasociados.es',
    phone: '+34 93 222 33 44',
    type: 'supplier',
    address: 'Carrer de Provença 318, 08037 Barcelona',
    city: 'Barcelona',
    cp: '08037',
    country: 'ES',
    notes: 'Gestoría laboral y fiscal. Pago trimestral.',
  },
];

console.log('\n📋 Creando contactos...');
const createdContacts = {};
for (const c of contacts) {
  const res = await api('POST', '/api/invoicing/v1/contacts', c);
  if (res?.id) {
    createdContacts[c.name] = res.id;
    console.log(`  ✓ ${c.name} (${res.id})`);
  }
}

// ── Productos ─────────────────────────────────────────────────────────────────

const products = [
  { name: 'Consultoría de gestión empresarial', desc: 'Sesión de consultoría estratégica y operativa. Duración: 1 hora.', price: 150, tax: 21, sku: 'CONS-001', kind: 'simple' },
  { name: 'Implementación de software ERP', desc: 'Servicio completo de implementación, migración de datos y formación.', price: 2500, tax: 21, sku: 'ERP-001', kind: 'simple' },
  { name: 'Sesión de formación empresarial', desc: 'Formación grupal en gestión, finanzas o procesos. Hasta 10 asistentes.', price: 300, tax: 21, sku: 'FORM-001', kind: 'simple' },
  { name: 'Análisis financiero mensual', desc: 'Revisión y reporte mensual de P&L, tesorería y KPIs financieros.', price: 450, tax: 21, sku: 'FIN-001', kind: 'simple' },
  { name: 'Licencia software de gestión (anual)', desc: 'Licencia anual del módulo de gestión documental para 5 usuarios.', price: 1200, tax: 21, sku: 'LIC-001', kind: 'simple' },
];

console.log('\n📦 Creando productos...');
const createdProducts = {};
for (const p of products) {
  const res = await api('POST', '/api/invoicing/v1/products', p);
  if (res?.id) {
    createdProducts[p.name] = res.id;
    console.log(`  ✓ ${p.name} — ${p.price}€ (${res.id})`);
  }
}

// ── Facturas emitidas ─────────────────────────────────────────────────────────

// Timestamps para fechas realistas (últimos 3 meses)
const now = Math.floor(Date.now() / 1000);
const d = (daysAgo) => now - daysAgo * 86400;

const invoices = [
  {
    contactId: createdContacts['Construcciones Martínez S.L.'],
    date: d(45),
    dueDate: d(15),
    notes: 'Servicios de consultoría y formación — Q1 2026',
    items: [
      { name: 'Consultoría de gestión empresarial', units: 8, subtotal: 150, tax: 21 },
      { name: 'Sesión de formación empresarial', units: 2, subtotal: 300, tax: 21 },
    ],
  },
  {
    contactId: createdContacts['Tech Solutions Barcelona S.L.U.'],
    date: d(30),
    dueDate: d(0),
    notes: 'Implementación ERP — Fase 1',
    items: [
      { name: 'Implementación de software ERP', units: 1, subtotal: 2500, tax: 21 },
      { name: 'Consultoría de gestión empresarial', units: 4, subtotal: 150, tax: 21 },
      { name: 'Licencia software de gestión (anual)', units: 1, subtotal: 1200, tax: 21 },
    ],
  },
  {
    contactId: createdContacts['Distribuciones García e Hijos S.A.'],
    date: d(10),
    dueDate: d(-20),
    notes: 'Análisis financiero — Marzo 2026',
    items: [
      { name: 'Análisis financiero mensual', units: 1, subtotal: 450, tax: 21 },
    ],
  },
];

console.log('\n🧾 Creando facturas...');
for (const inv of invoices) {
  if (!inv.contactId) { console.log('  ⚠ Contacto no encontrado, salto factura'); continue; }
  const res = await api('POST', '/api/invoicing/v1/documents/invoice', inv);
  if (res?.id) {
    console.log(`  ✓ Factura ${res.docNumber ?? res.id} — contactId ${inv.contactId}`);
  }
}

// ── Presupuestos ─────────────────────────────────────────────────────────────

console.log('\n📝 Creando presupuesto...');
const quote = {
  contactId: createdContacts['Tech Solutions Barcelona S.L.U.'],
  date: d(5),
  dueDate: d(-25),
  notes: 'Propuesta Fase 2 — Formación y soporte post-implementación ERP',
  items: [
    { name: 'Sesión de formación empresarial', units: 4, subtotal: 300, tax: 21 },
    { name: 'Consultoría de gestión empresarial', units: 10, subtotal: 150, tax: 21 },
    { name: 'Análisis financiero mensual', units: 3, subtotal: 450, tax: 21 },
  ],
};
if (quote.contactId) {
  const res = await api('POST', '/api/invoicing/v1/documents/salesorder', quote);
  if (res?.id) console.log(`  ✓ Pedido/Presupuesto ${res.docNumber ?? res.id}`);
}

// ── Proyectos ─────────────────────────────────────────────────────────────────

console.log('\n🗂 Creando proyecto...');
const project = {
  name: 'Implementación ERP — Construcciones Martínez',
  description:
    'Proyecto de implementación completa del ERP empresarial. Incluye análisis de procesos, migración de datos históricos, formación del equipo y soporte post-arranque.',
  status: 1, // activo
  startDate: d(60),
  endDate: d(-30),
  contactId: createdContacts['Construcciones Martínez S.L.'],
};
const projRes = await api('POST', '/api/projects/v1/projects', project);
if (projRes?.id) {
  console.log(`  ✓ Proyecto: ${project.name} (${projRes.id})`);
  console.log('  ℹ Las tareas deben crearse manualmente desde la UI de Holded (Tasks API no disponible en este plan).');
}

console.log('\n✅ Seed completado. Cuenta demo "Nova Gestión" lista para QA de Anthropic.\n');
