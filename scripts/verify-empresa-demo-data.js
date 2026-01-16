#!/usr/bin/env node

/**
 * Script para verificar datos de Empresa Demo SL
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../apps/app/.env.local') });
const { Pool } = require('pg');

const EMPRESA_DEMO_ID = '664ed15c-01f1-4b85-83fe-18d5019f89b7';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('db.prisma.io') ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('🔍 Verificando datos de Empresa Demo SL...\n');

    // Clientes
    const customers = await pool.query(
      'SELECT COUNT(*) as count FROM customers WHERE tenant_id = $1',
      [EMPRESA_DEMO_ID]
    );
    console.log(`📋 Clientes: ${customers.rows[0].count}`);

    // Artículos
    const articles = await pool.query(
      'SELECT COUNT(*) as count FROM articles WHERE tenant_id = $1',
      [EMPRESA_DEMO_ID]
    );
    console.log(`📦 Artículos: ${articles.rows[0].count}`);

    // Facturas
    const invoices = await pool.query(
      'SELECT COUNT(*) as count, SUM(amount_gross) as total FROM invoices WHERE tenant_id = $1',
      [EMPRESA_DEMO_ID]
    );
    console.log(`💰 Facturas: ${invoices.rows[0].count} (Total: ${invoices.rows[0].total}€)`);

    // Líneas de factura
    const lines = await pool.query(
      'SELECT COUNT(*) as count FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id = $1)',
      [EMPRESA_DEMO_ID]
    );
    console.log(`📄 Líneas de factura: ${lines.rows[0].count}`);

    // Proveedores
    const suppliers = await pool.query(
      'SELECT COUNT(*) as count FROM suppliers WHERE tenant_id = $1',
      [EMPRESA_DEMO_ID]
    );
    console.log(`🏢 Proveedores: ${suppliers.rows[0].count}`);

    // Gastos
    const expenses = await pool.query(
      'SELECT COUNT(*) as count, SUM(amount * (1 + tax_rate)) as total FROM expense_records WHERE tenant_id = $1',
      [EMPRESA_DEMO_ID]
    );
    console.log(`💸 Gastos: ${expenses.rows[0].count} (Total: ${expenses.rows[0].total}€)`);

    console.log('\n✅ Datos verificados');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
