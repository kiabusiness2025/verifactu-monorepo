const https = require('https');

// Test del webhook de Resend
// Este script simula un email recibido para probar el sistema

const webhookURL = 'http://localhost:3000/api/webhooks/resend';

const testPayload = {
  type: 'email.received',
  created_at: new Date().toISOString(),
  data: {
    message_id: `test-${Date.now()}`,
    from: {
      email: 'cliente@ejemplo.com',
      name: 'Cliente de Prueba'
    },
    to: ['soporte@verifactu.business'],
    subject: '🧪 Test de sistema de emails',
    text: 'Este es un email de prueba para verificar que el webhook está funcionando correctamente. Si ves esto en el panel admin, ¡todo funciona!',
    html: '<p>Este es un email de <strong>prueba</strong> para verificar que el webhook está funcionando correctamente.</p><p>Si ves esto en el panel admin, ¡todo funciona! 🎉</p>'
  }
};

console.log('\n📧 Test de Webhook - Sistema de Emails\n');
console.log('🎯 Enviando email de prueba al webhook...');
console.log(`   URL: ${webhookURL}`);
console.log(`   De: ${testPayload.data.from.name} <${testPayload.data.from.email}>`);
console.log(`   Asunto: ${testPayload.data.subject}\n`);

const data = JSON.stringify(testPayload);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/resend',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    // Si tienes el webhook secret configurado:
    // 'resend-signature': 'whsec_...'
  }
};

const req = require('http').request(options, (res) => {
  let response = '';

  res.on('data', (chunk) => {
    response += chunk;
  });

  res.on('end', () => {
    console.log(`✅ Respuesta del servidor (${res.statusCode}):`);
    try {
      const parsed = JSON.parse(response);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.success) {
        console.log('\n🎉 ¡Email procesado exitosamente!');
        console.log(`   Prioridad: ${parsed.priority}`);
        console.log(`   Status: ${parsed.status}`);
        console.log('\n📱 Verifica en: http://localhost:3000/dashboard/admin/emails\n');
      }
    } catch (e) {
      console.log(response);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Error al conectar con el webhook:');
  console.error(error.message);
  console.error('\n💡 Asegúrate de que el servidor está corriendo:');
  console.error('   pnpm dev\n');
});

req.write(data);
req.end();
