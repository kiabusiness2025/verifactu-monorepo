const http = require('http');

const testPayload = {
  type: 'email.received',
  created_at: new Date().toISOString(),
  data: {
    message_id: `test-${Date.now()}`,
    from: {
      email: 'test@ejemplo.com',
      name: 'Usuario Test'
    },
    to: ['soporte@verifactu.business'],
    subject: '🧪 Email de prueba URGENTE',
    text: 'Este es un email de prueba con palabras clave: URGENTE, ERROR, AYUDA. Necesito ayuda con un problema crítico.',
    html: '<p>Este es un email de <strong>prueba</strong> con palabras clave: <span style="color:red">URGENTE</span>, ERROR, AYUDA.</p><p>Necesito ayuda con un problema crítico.</p>'
  }
};

console.log('\n📧 Enviando email de test al webhook...\n');

const data = JSON.stringify(testPayload);
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/resend',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'resend-signature': 'whsec_fFFxCRD3n1auUXCS5W3ALfgotgjvht4H'
  }
};

const req = http.request(options, (res) => {
  let response = '';
  
  res.on('data', (chunk) => {
    response += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Respuesta:', response);
    
    if (res.statusCode === 200) {
      console.log('\n✅ Email guardado en BD');
      console.log('👉 Ve a: http://localhost:3000/dashboard/admin/emails\n');
    } else {
      console.log('\n❌ Error al procesar email\n');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(data);
req.end();
