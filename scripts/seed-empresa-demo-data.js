#!/usr/bin/env node

/**
 * Script para poblar la Empresa Demo SL con datos de muestra reales
 * 
 * Crea:
 * - 3 clientes
 * - 3 artículos/servicios
 * - 3 facturas con líneas (≈25.000€)
 * - 3 proveedores
 * - 3 gastos operativos (≈650€)
 * 
 * Beneficio visible: ≈24.350€
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../apps/app/.env.local') });
const { Pool } = require('pg');

const EMPRESA_DEMO_ID = '664ed15c-01f1-4b85-83fe-18d5019f89b7';

// Para createdBy, usaremos un ID de sistema genérico
const SYSTEM_USER_ID = 'system-demo-seed';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('db.prisma.io') ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('🌱 Poblando Empresa Demo SL con datos de muestra...\n');

    // 1. Verificar que la Empresa Demo existe
    const tenantCheck = await pool.query(
      `SELECT id, name FROM tenants WHERE id = $1 AND is_demo = TRUE`,
      [EMPRESA_DEMO_ID]
    );

    if (tenantCheck.rows.length === 0) {
      console.error('❌ Empresa Demo SL no encontrada o no está marcada como is_demo = TRUE');
      console.error('   Ejecuta primero: node scripts/seed-demo-tenant.js');
      process.exit(1);
    }

    console.log(`✓ Empresa Demo encontrada: ${tenantCheck.rows[0].name}\n`);

    // 2. Crear usuario de sistema si no existe
    await pool.query(
      `INSERT INTO users (id, email, name, created_at)
       VALUES ($1, 'system@verifactu.business', 'Sistema', NOW())
       ON CONFLICT (id) DO NOTHING`,
      [SYSTEM_USER_ID]
    );

    // 3. CLIENTES
    console.log('📋 Creando clientes...');
    
    const clientes = [
      {
        name: 'Cliente Premium SA',
        nif: 'A12345678',
        email: 'ventas@clientepremium.es',
        phone: '+34 911 234 567',
        address: 'Calle Gran Vía 28',
        city: 'Madrid',
        postalCode: '28013',
        paymentTerms: '30 días'
      },
      {
        name: 'Comercial Norte SL',
        nif: 'B87654321',
        email: 'compras@comercialnorte.es',
        phone: '+34 943 876 543',
        address: 'Avenida Libertad 15',
        city: 'San Sebastián',
        postalCode: '20004',
        paymentTerms: '60 días'
      },
      {
        name: 'Tech Solutions Ltd',
        nif: 'N0012345I',
        email: 'billing@techsolutions.com',
        phone: '+44 20 7946 0958',
        address: '123 Silicon Street',
        city: 'London',
        postalCode: 'EC2A 4BX',
        country: 'GB',
        paymentTerms: 'Inmediato'
      }
    ];

    const clienteIds = [];
    for (const cliente of clientes) {
      // Primero intentar obtener el ID si ya existe
      let result = await pool.query(
        `SELECT id FROM customers WHERE tenant_id = $1 AND nif = $2`,
        [EMPRESA_DEMO_ID, cliente.nif]
      );
      
      if (result.rows.length === 0) {
        // Si no existe, insertarlo
        result = await pool.query(
          `INSERT INTO customers (tenant_id, name, nif, email, phone, address, city, postal_code, country, payment_terms, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW(), NOW())
           RETURNING id`,
        [
          EMPRESA_DEMO_ID,
          cliente.name,
          cliente.nif,
          cliente.email,
          cliente.phone,
          cliente.address,
          cliente.city,
          cliente.postalCode,
          cliente.country || 'ES',
          cliente.paymentTerms
        ]);
      }
      
      clienteIds.push({ id: result.rows[0].id, name: cliente.name });
      console.log(`  ✓ ${cliente.name}`);
    }

    // 4. ARTÍCULOS / SERVICIOS
    console.log('\n📦 Creando artículos/servicios...');
    
    const articulos = [
      {
        code: 'CONS-001',
        name: 'Consultoría Estratégica',
        description: 'Consultoría estratégica de negocio (por hora)',
        category: 'Servicios profesionales',
        unitPrice: 120.00,
        taxRate: 0.21,
        unit: 'hora'
      },
      {
        code: 'DEV-001',
        name: 'Desarrollo de Software',
        description: 'Desarrollo a medida de aplicaciones (por día)',
        category: 'Servicios técnicos',
        unitPrice: 800.00,
        taxRate: 0.21,
        unit: 'día'
      },
      {
        code: 'MANT-001',
        name: 'Mantenimiento Mensual',
        description: 'Servicio de mantenimiento y soporte técnico',
        category: 'Mantenimiento',
        unitPrice: 450.00,
        taxRate: 0.21,
        unit: 'mes'
      }
    ];

    const articuloIds = [];
    for (const articulo of articulos) {
      const result = await pool.query(
        `INSERT INTO articles (tenant_id, code, name, description, category, unit_price, tax_rate, unit, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW(), NOW())
         ON CONFLICT (tenant_id, code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           unit_price = EXCLUDED.unit_price,
           updated_at = NOW()
         RETURNING id`,
        [
          EMPRESA_DEMO_ID,
          articulo.code,
          articulo.name,
          articulo.description,
          articulo.category,
          articulo.unitPrice,
          articulo.taxRate,
          articulo.unit
        ]
      );
      
      articuloIds.push({ 
        id: result.rows[0].id, 
        name: articulo.name,
        unitPrice: articulo.unitPrice,
        taxRate: articulo.taxRate
      });
      console.log(`  ✓ ${articulo.name} (${articulo.unitPrice}€/${articulo.unit})`);
    }

    // 5. FACTURAS con líneas
    console.log('\n💰 Creando facturas...');
    
    const facturas = [
      {
        clienteIdx: 0, // Cliente Premium SA
        number: 'DEMO-2026-001',
        issueDate: '2026-01-10',
        lineas: [
          { articuloIdx: 0, quantity: 80 }, // 80h consultoría = 9.600€
          { articuloIdx: 2, quantity: 3 }   // 3 meses mant = 1.350€
        ],
        notes: 'Proyecto Q4 2025 - Consultoría estratégica y mantenimiento'
      },
      {
        clienteIdx: 1, // Comercial Norte SL
        number: 'DEMO-2026-002',
        issueDate: '2026-01-12',
        lineas: [
          { articuloIdx: 1, quantity: 12 } // 12 días desarrollo = 9.600€
        ],
        notes: 'Desarrollo plataforma e-commerce'
      },
      {
        clienteIdx: 2, // Tech Solutions Ltd
        number: 'DEMO-2026-003',
        issueDate: '2026-01-14',
        lineas: [
          { articuloIdx: 0, quantity: 40 }, // 40h consultoría = 4.800€
        ],
        notes: 'Auditoría técnica y consultoría'
      }
    ];

    let totalFacturado = 0;

    for (const factura of facturas) {
      // Calcular totales
      let amountNet = 0;
      const lineasData = [];

      for (const linea of factura.lineas) {
        const articulo = articuloIds[linea.articuloIdx];
        const lineTotal = articulo.unitPrice * linea.quantity;
        amountNet += lineTotal;
        
        lineasData.push({
          articleId: articulo.id,
          quantity: linea.quantity,
          unitPrice: articulo.unitPrice,
          taxRate: articulo.taxRate,
          lineTotal
        });
      }

      const amountTax = amountNet * 0.21; // IVA 21%
      const amountGross = amountNet + amountTax;

      totalFacturado += amountGross;

      const cliente = clienteIds[factura.clienteIdx];

      // Insertar factura
      const invoiceResult = await pool.query(
        `INSERT INTO invoices (tenant_id, customer_id, number, issue_date, customer_name, customer_nif, currency, amount_gross, amount_tax, amount_net, status, notes, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'EUR', $7, $8, $9, 'paid', $10, $11, NOW(), NOW())
         RETURNING id`,
        [
          EMPRESA_DEMO_ID,
          cliente.id,
          factura.number,
          factura.issueDate,
          cliente.name,
          clientes[factura.clienteIdx].nif,
          amountGross,
          amountTax,
          amountNet,
          factura.notes,
          SYSTEM_USER_ID
        ]
      );

      const invoiceId = invoiceResult.rows[0].id;

      // Insertar líneas de factura
      for (const lineaData of lineasData) {
        await pool.query(
          `INSERT INTO invoice_lines (invoice_id, article_id, quantity, unit_price, tax_rate, discount, line_total, created_at)
           VALUES ($1, $2, $3, $4, $5, 0, $6, NOW())`,
          [
            invoiceId,
            lineaData.articleId,
            lineaData.quantity,
            lineaData.unitPrice,
            lineaData.taxRate,
            lineaData.lineTotal
          ]
        );
      }

      // Crear pago automático
      await pool.query(
        `INSERT INTO payments (invoice_id, tenant_id, amount, method, reference, paid_at, created_at)
         VALUES ($1, $2, $3, 'bank_transfer', $4, $5, NOW())`,
        [
          invoiceId,
          EMPRESA_DEMO_ID,
          amountGross,
          `Pago ${factura.number}`,
          factura.issueDate
        ]
      );

      console.log(`  ✓ ${factura.number} - ${cliente.name} - ${amountGross.toFixed(2)}€ (IVA inc.)`);
    }

    // 6. PROVEEDORES
    console.log('\n🏢 Creando proveedores...');
    
    const proveedores = [
      {
        name: 'Amazon Web Services EMEA SARL',
        nif: 'ESN0000000A',
        email: 'billing-emea@amazon.com',
        phone: '+352 2789 0057',
        address: '38 Avenue John F. Kennedy',
        city: 'Luxembourg',
        postalCode: 'L-1855',
        country: 'LU',
        accountCode: '626',
        paymentTerms: 'Domiciliación mensual'
      },
      {
        name: 'Vodafone España SA',
        nif: 'A80907397',
        email: 'empresas@vodafone.es',
        phone: '+34 900 123 000',
        address: 'Avenida de América 115',
        city: 'Madrid',
        postalCode: '28042',
        accountCode: '629',
        paymentTerms: 'Domiciliación mensual'
      },
      {
        name: 'Papelería Gómez SL',
        nif: 'B12398765',
        email: 'ventas@papeleriagomez.es',
        phone: '+34 913 456 789',
        address: 'Calle Artesanos 8',
        city: 'Madrid',
        postalCode: '28022',
        accountCode: '629',
        paymentTerms: '30 días'
      }
    ];

    const proveedorIds = [];
    for (const proveedor of proveedores) {
      // Primero intentar obtener el ID si ya existe
      let result = await pool.query(
        `SELECT id FROM suppliers WHERE tenant_id = $1 AND nif = $2`,
        [EMPRESA_DEMO_ID, proveedor.nif]
      );
      
      if (result.rows.length === 0) {
        // Si no existe, insertarlo
        result = await pool.query(
          `INSERT INTO suppliers (tenant_id, name, nif, email, phone, address, city, postal_code, country, account_code, payment_terms, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, NOW(), NOW())
           RETURNING id`,
        [
          EMPRESA_DEMO_ID,
          proveedor.name,
          proveedor.nif,
          proveedor.email,
          proveedor.phone,
          proveedor.address,
          proveedor.city,
          proveedor.postalCode,
          proveedor.country || 'ES',
          proveedor.accountCode,
          proveedor.paymentTerms
        ]);
      }
      
      proveedorIds.push({ id: result.rows[0].id, name: proveedor.name });
      console.log(`  ✓ ${proveedor.name}`);
    }

    // 7. GASTOS OPERATIVOS
    console.log('\n💸 Creando gastos operativos...');
    
    const gastos = [
      {
        proveedorIdx: 0, // AWS
        date: '2026-01-05',
        description: 'Servicios cloud AWS - Diciembre 2025',
        category: 'Servicios tecnológicos',
        amount: 285.50,
        taxRate: 0.21,
        accountCode: '626',
        reference: 'INV-2025-12-AWS'
      },
      {
        proveedorIdx: 1, // Vodafone
        date: '2026-01-08',
        description: 'Líneas móviles y fibra - Diciembre 2025',
        category: 'Telecomunicaciones',
        amount: 156.20,
        taxRate: 0.21,
        accountCode: '629',
        reference: 'FA-202512-VF'
      },
      {
        proveedorIdx: 2, // Papelería
        date: '2026-01-12',
        description: 'Material de oficina (papel, tóner, archivadores)',
        category: 'Suministros',
        amount: 89.30,
        taxRate: 0.21,
        accountCode: '629',
        reference: 'ALB-2026-0034'
      }
    ];

    let totalGastos = 0;

    for (const gasto of gastos) {
      const proveedor = proveedorIds[gasto.proveedorIdx];
      const amountWithTax = gasto.amount * (1 + gasto.taxRate);
      totalGastos += amountWithTax;

      await pool.query(
        `INSERT INTO expense_records (tenant_id, supplier_id, date, description, category, amount, tax_rate, account_code, reference, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          EMPRESA_DEMO_ID,
          proveedor.id,
          gasto.date,
          gasto.description,
          gasto.category,
          gasto.amount,
          gasto.taxRate,
          gasto.accountCode,
          gasto.reference
        ]
      );

      console.log(`  ✓ ${proveedor.name} - ${amountWithTax.toFixed(2)}€ (IVA inc.)`);
    }

    // 8. RESUMEN FINAL
    const beneficio = totalFacturado - totalGastos;

    console.log('\n' + '='.repeat(60));
    console.log('✅ DATOS DE MUESTRA CREADOS CORRECTAMENTE\n');
    console.log(`📊 RESUMEN FINANCIERO:`);
    console.log(`   Total Facturado: ${totalFacturado.toFixed(2)}€`);
    console.log(`   Total Gastos:    ${totalGastos.toFixed(2)}€`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   💰 BENEFICIO:     ${beneficio.toFixed(2)}€`);
    console.log('='.repeat(60));
    
    console.log(`\n💡 Ahora los usuarios que accedan a "Empresa Demo SL" verán:`);
    console.log(`   • ${clientes.length} clientes registrados`);
    console.log(`   • ${articulos.length} servicios/productos`);
    console.log(`   • ${facturas.length} facturas emitidas y cobradas`);
    console.log(`   • ${proveedores.length} proveedores activos`);
    console.log(`   • ${gastos.length} gastos registrados`);
    console.log(`   • Beneficio real visible en dashboard 📈\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
