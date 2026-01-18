/**
 * Script para verificar el estado de webhooks en Resend
 * y consultar emails recientes
 */

require('dotenv').config({ path: '../apps/app/.env.local' });

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function checkWebhooks() {
  console.log('\n🔍 VERIFICANDO WEBHOOKS EN RESEND\n');
  
  try {
    // Listar webhooks configurados
    const webhooksResponse = await fetch('https://api.resend.com/webhooks', {
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!webhooksResponse.ok) {
      console.log('❌ Error al obtener webhooks:', webhooksResponse.status);
      const error = await webhooksResponse.text();
      console.log(error);
      return;
    }
    
    const webhooks = await webhooksResponse.json();
    console.log('📡 Webhooks configurados:', JSON.stringify(webhooks, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function checkRecentEmails() {
  console.log('\n📧 CONSULTANDO EMAILS RECIENTES EN RESEND\n');
  
  try {
    // Obtener emails recientes
    const emailsResponse = await fetch('https://api.resend.com/emails?limit=10', {
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!emailsResponse.ok) {
      console.log('❌ Error al obtener emails:', emailsResponse.status);
      return;
    }
    
    const emails = await emailsResponse.json();
    console.log('📨 Emails recientes:', JSON.stringify(emails, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar checks
(async () => {
  await checkWebhooks();
  await checkRecentEmails();
  
  console.log('\n💡 INSTRUCCIONES:\n');
  console.log('1. Verifica que el webhook apunte a: https://app.verifactu.business/api/webhooks/resend');
  console.log('2. Verifica que el evento sea: email.received');
  console.log('3. Revisa en https://resend.com/webhooks los logs de intentos fallidos');
  console.log('4. Si hay errores 401/403, verifica el RESEND_WEBHOOK_SECRET en Vercel\n');
})();
