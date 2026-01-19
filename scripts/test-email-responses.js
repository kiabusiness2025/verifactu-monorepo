#!/usr/bin/env node
/**
 * Script para probar la funcionalidad de respuesta de emails desde admin
 * 
 * Uso:
 * node scripts/test-email-responses.js
 */

const https = require('https');
const http = require('http');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n═══════════════════════════════════════════', 'cyan');
  log(`  ${title}`, 'cyan');
  log('═══════════════════════════════════════════\n', 'cyan');
}

function makeRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  const baseUrl = process.env.ADMIN_TEST_URL || 'http://localhost:3000';
  const testEmail = 'test-response@ejemplo.com';

  logSection('📧 Test de Respuestas de Email');

  log('ℹ️  Base URL: ' + baseUrl, 'blue');
  log('ℹ️  Email de prueba: ' + testEmail, 'blue');

  try {
    // Test 1: Obtener lista de emails
    logSection('Test 1: Obtener lista de emails');
    log('GET /api/admin/emails', 'yellow');

    const emailsResponse = await makeRequest('GET', `${baseUrl}/api/admin/emails`);
    
    log(`Status: ${emailsResponse.status}`, emailsResponse.status === 200 ? 'green' : 'red');
    
    if (emailsResponse.status === 200) {
      const { emails, total, pending } = emailsResponse.body;
      log(`✅ Emails recibidos: ${total}`, 'green');
      log(`✅ Pendientes: ${pending}`, 'green');
      log(`✅ Primeros 3 emails:`, 'green');

      if (emails && emails.length > 0) {
        emails.slice(0, 3).forEach((email, i) => {
          log(`   ${i + 1}. [${email.status}] ${email.subject}`, 'blue');
          log(`      De: ${email.from}`, 'blue');
          log(`      ID: ${email.id}`, 'blue');
        });

        // Test 2: Enviar respuesta si hay emails
        if (emails.length > 0) {
          const firstEmail = emails[0];
          
          logSection('Test 2: Enviar respuesta de email');
          log(`Respondiendo a: ${firstEmail.subject}`, 'yellow');
          log(`De: ${firstEmail.from}`, 'yellow');

          const replyPayload = {
            originalEmailId: firstEmail.id,
            subject: `Re: ${firstEmail.subject}`,
            message: `Hola,\n\nGracias por contactarnos. Hemos recibido tu mensaje y nos pondremos en contacto pronto.\n\nSaludos,\nEquipo Verifactu`,
          };

          log(`POST /api/admin/emails/send`, 'yellow');
          log(`Body: ${JSON.stringify(replyPayload, null, 2)}`, 'blue');

          const replyResponse = await makeRequest(
            'POST',
            `${baseUrl}/api/admin/emails/send`,
            replyPayload
          );

          log(`Status: ${replyResponse.status}`, replyResponse.status === 200 ? 'green' : 'red');

          if (replyResponse.status === 200) {
            log(`✅ Respuesta enviada correctamente`, 'green');
            log(`   Message ID: ${replyResponse.body.messageId}`, 'green');
            log(`   Para: ${replyResponse.body.recipient}`, 'green');
            log(`   Asunto: ${replyResponse.body.subject}`, 'green');

            // Test 3: Obtener respuestas del email
            logSection('Test 3: Obtener respuestas enviadas');
            log(`GET /api/admin/emails/send?emailId=${firstEmail.id}`, 'yellow');

            const responsesResponse = await makeRequest(
              'GET',
              `${baseUrl}/api/admin/emails/send?emailId=${firstEmail.id}`
            );

            log(`Status: ${responsesResponse.status}`, responsesResponse.status === 200 ? 'green' : 'red');

            if (responsesResponse.status === 200) {
              const { count, responses } = responsesResponse.body;
              log(`✅ Respuestas encontradas: ${count}`, 'green');

              if (responses && responses.length > 0) {
                responses.forEach((resp, i) => {
                  log(`   ${i + 1}. Enviado a: ${resp.to_email}`, 'blue');
                  log(`      Asunto: ${resp.subject}`, 'blue');
                  log(`      Fecha: ${new Date(resp.sent_at).toLocaleString()}`, 'blue');
                });
              }
            } else {
              log(`❌ Error al obtener respuestas: ${responsesResponse.status}`, 'red');
            }
          } else {
            log(`❌ Error al enviar respuesta: ${replyResponse.status}`, 'red');
            if (replyResponse.body.error) {
              log(`   Error: ${replyResponse.body.error}`, 'red');
            }
          }
        }
      } else {
        log('⚠️  No hay emails en la bandeja', 'yellow');
        log('Primero envía un email de prueba desde:', 'yellow');
        log(`${baseUrl}/dashboard/admin/emails?tab=testing`, 'cyan');
      }
    } else {
      log(`❌ Error al obtener emails: ${emailsResponse.status}`, 'red');
      if (emailsResponse.body && emailsResponse.body.error) {
        log(`   Error: ${emailsResponse.body.error}`, 'red');
      }
    }
  } catch (error) {
    log(`\n❌ Error durante las pruebas:`, 'red');
    log(`${error.message}`, 'red');

    if (error.code === 'ECONNREFUSED') {
      log(`\nℹ️  El servidor no está disponible en: ${baseUrl}`, 'yellow');
      log('Inicia el servidor con: pnpm dev', 'yellow');
    }
  }

  logSection('✅ Pruebas completadas');
  log('Para más información, ver: docs/MAILBOX_ADMIN_CONFIGURATION.md', 'blue');
}

// Ejecutar pruebas
runTests().catch(err => {
  log(`\n❌ Error fatal: ${err.message}`, 'red');
  process.exit(1);
});
