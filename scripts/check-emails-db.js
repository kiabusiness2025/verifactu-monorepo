const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || "postgres://ac6301a89a331d0804886bc5ec74defbf3936e04b3df46e947d11351cd05781e:sk_4DiO6MaTSwrdOJXitAE8H@db.prisma.io:5432/postgres?sslmode=require";

console.log('\n📊 Verificando emails en la base de datos...\n');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkEmails() {
  try {
    console.log('🔌 Conectando a PostgreSQL...');
    
    // Verificar si la tabla existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'admin_emails'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ La tabla admin_emails no existe');
      console.log('   Ejecuta: node scripts/apply-email-migration.js\n');
      return;
    }
    
    console.log('✓ Tabla admin_emails existe\n');
    
    // Contar emails
    const countResult = await pool.query('SELECT COUNT(*) as total FROM admin_emails');
    const total = parseInt(countResult.rows[0].total);
    
    console.log(`📧 Emails en base de datos: ${total}\n`);
    
    if (total === 0) {
      console.log('⚠️  No hay emails guardados aún\n');
      console.log('Posibles causas:');
      console.log('  1. No se han enviado emails a soporte@verifactu.business');
      console.log('  2. El webhook de Resend no está configurado correctamente');
      console.log('  3. La URL del webhook es incorrecta');
      console.log('  4. El webhook secret no coincide\n');
      console.log('💡 Verifica en Resend:');
      console.log('   https://resend.com/webhooks');
      console.log('   URL debe ser: https://app.verifactu.business/api/webhooks/resend');
      console.log('   Evento: email.received\n');
    } else {
      // Mostrar últimos emails
      const emails = await pool.query(`
        SELECT id, from_email, subject, status, priority, received_at
        FROM admin_emails
        ORDER BY received_at DESC
        LIMIT 10
      `);
      
      console.log('📬 Últimos emails recibidos:\n');
      emails.rows.forEach((email, i) => {
        const date = new Date(email.received_at).toLocaleString('es-ES');
        const priorityIcon = email.priority === 'high' ? '🔴' : email.priority === 'low' ? '⚪' : '🔵';
        const statusIcon = email.status === 'pending' ? '⏳' : email.status === 'responded' ? '✅' : '📦';
        
        console.log(`${i + 1}. ${statusIcon} ${priorityIcon} De: ${email.from_email}`);
        console.log(`   Asunto: ${email.subject}`);
        console.log(`   Fecha: ${date}`);
        console.log(`   Status: ${email.status}\n`);
      });
      
      // Stats
      const stats = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'responded') as responded,
          COUNT(*) FILTER (WHERE status = 'archived') as archived,
          COUNT(*) FILTER (WHERE status = 'spam') as spam
        FROM admin_emails
      `);
      
      const s = stats.rows[0];
      console.log('📊 Estadísticas:');
      console.log(`   Pendientes: ${s.pending}`);
      console.log(`   Respondidos: ${s.responded}`);
      console.log(`   Archivados: ${s.archived}`);
      console.log(`   Spam: ${s.spam}\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nDetalles:', error);
  } finally {
    await pool.end();
  }
}

checkEmails();
