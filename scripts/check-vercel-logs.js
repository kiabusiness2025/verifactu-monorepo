/**
 * Script para verificar logs del webhook en Vercel
 */

console.log('\n📋 INSTRUCCIONES PARA VERIFICAR WEBHOOK:\n');

console.log('1️⃣ Ve a Resend Dashboard:');
console.log('   https://resend.com/webhooks\n');

console.log('2️⃣ Verifica la configuración del webhook:');
console.log('   ✓ URL: https://app.verifactu.business/api/webhooks/resend');
console.log('   ✓ Evento: email.received (NO email.sent)');
console.log('   ✓ Estado: Activo\n');

console.log('3️⃣ Ve a los logs del webhook en Resend:');
console.log('   Busca intentos de entrega (delivery attempts)');
console.log('   Si hay errores, verás el código HTTP (401, 403, 500, etc.)\n');

console.log('4️⃣ Envía un email de prueba:');
console.log('   De: expertestudiospro@gmail.com');
console.log('   Para: soporte@verifactu.business');
console.log('   Asunto: Test webhook');
console.log('   Cuerpo: Hola, esto es una prueba\n');

console.log('5️⃣ Ve a Vercel logs en tiempo real:');
console.log('   https://vercel.com/ksenias-projects-16d8d1fb/app/logs\n');

console.log('6️⃣ Verifica en la base de datos:');
console.log('   node scripts/check-emails-db.js\n');

console.log('💡 DEBUGGING:');
console.log('   Si el webhook NO aparece en logs de Resend → webhook no configurado');
console.log('   Si hay error 401/403 → RESEND_WEBHOOK_SECRET incorrecto');
console.log('   Si hay error 500 → problema en el código del webhook');
console.log('   Si retorna 200 pero no guarda → problema con PostgreSQL\n');
