/**
 * Test del webhook de Resend en producción
 */

const WEBHOOK_URL = 'https://app.verifactu.business/api/webhooks/resend';

async function testWebhook() {
  console.log('\n🧪 PROBANDO WEBHOOK EN PRODUCCIÓN\n');
  console.log(`URL: ${WEBHOOK_URL}\n`);
  
  try {
    // Test GET (debería retornar 405)
    console.log('1. Probando GET request...');
    const getResponse = await fetch(WEBHOOK_URL, {
      method: 'GET'
    });
    console.log(`   Status: ${getResponse.status}`);
    const getText = await getResponse.text();
    console.log(`   Response: ${getText}\n`);
    
    // Test POST sin autenticación (debería retornar 401)
    console.log('2. Probando POST sin signature...');
    const postResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'email.received',
        data: {
          from: 'test@example.com',
          to: 'soporte@verifactu.business',
          subject: 'Test',
          text: 'Test message'
        }
      })
    });
    console.log(`   Status: ${postResponse.status}`);
    const postText = await postResponse.text();
    console.log(`   Response: ${postText}\n`);
    
    console.log('✅ El webhook está respondiendo');
    console.log('⚠️  Ahora verifica en Resend Dashboard si el webhook está configurado\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWebhook();
