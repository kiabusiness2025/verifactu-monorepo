// C-C — Veto endpoint para la presentación automática 303.
//
// GET /api/isaak/modelos/303/veto?token=<vetoToken>
//
// No requiere autenticación: el token es el único factor (one-click desde email).
// Responde con HTML para que el usuario vea confirmación directa en el navegador.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

function htmlPage(title: string, heading: string, body: string, color: string): Response {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8faff;font-family:system-ui,sans-serif;padding:24px}
    .card{background:#fff;border-radius:16px;box-shadow:0 4px 32px rgba(15,23,42,.09);max-width:480px;width:100%;overflow:hidden}
    .header{background:${color};padding:28px 32px}
    .header h1{color:#fff;font-size:20px;font-weight:700}
    .body{padding:32px}
    .body p{font-size:15px;color:#374151;line-height:1.65;margin-bottom:16px}
    .body p:last-child{margin-bottom:0}
    .link{display:inline-block;margin-top:24px;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600}
    .note{font-size:12px;color:#94a3b8;margin-top:20px}
  </style>
</head>
<body>
  <div class="card">
    <div class="header"><h1>${heading}</h1></div>
    <div class="body">
      ${body}
      <a class="link" href="https://isaak.verifactu.business">Ir a Isaak</a>
      <p class="note">Isaak · Copiloto fiscal IA · verifactu.business</p>
    </div>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim();

  if (!token) {
    return htmlPage(
      'Enlace no válido — Isaak',
      '⚠️ Enlace no válido',
      '<p>El enlace de cancelación no es válido o está incompleto. Comprueba el email que recibiste de Isaak.</p>',
      'linear-gradient(135deg,#78350f,#92400e)'
    );
  }

  const entry = await prisma.isaakAutoSubmit303Queue.findUnique({
    where: { vetoToken: token },
    select: { id: true, status: true, vetoExpiresAt: true, ejercicio: true, periodo: true },
  });

  if (!entry) {
    return htmlPage(
      'Enlace no válido — Isaak',
      '⚠️ Enlace no válido',
      '<p>No hemos encontrado ninguna presentación asociada a este enlace. Es posible que ya haya sido cancelada o que el enlace haya caducado.</p>',
      'linear-gradient(135deg,#78350f,#92400e)'
    );
  }

  if (entry.status === 'vetoed') {
    return htmlPage(
      'Ya cancelada — Isaak',
      '✅ Presentación ya cancelada',
      `<p>La presentación automática del <strong>Modelo 303 ${entry.periodo} ${entry.ejercicio}</strong> ya fue cancelada previamente.</p>
       <p>Si quieres presentar el 303 manualmente, puedes hacerlo desde Isaak en cualquier momento antes del plazo.</p>`,
      'linear-gradient(135deg,#14532d,#15803d)'
    );
  }

  if (entry.status === 'submitted') {
    return htmlPage(
      'Ya presentada — Isaak',
      'ℹ️ El 303 ya fue presentado',
      `<p>El <strong>Modelo 303 ${entry.periodo} ${entry.ejercicio}</strong> ya ha sido presentado automáticamente a la AEAT.</p>
       <p>Puedes consultar el justificante de presentación en Isaak.</p>`,
      'linear-gradient(135deg,#1e3a5f,#1d4ed8)'
    );
  }

  if (entry.status !== 'pending_veto') {
    return htmlPage(
      'No disponible — Isaak',
      'ℹ️ Estado no cancelable',
      `<p>La presentación automática del <strong>Modelo 303 ${entry.periodo} ${entry.ejercicio}</strong> está en estado <em>${entry.status}</em> y no puede cancelarse en este momento.</p>`,
      'linear-gradient(135deg,#374151,#4b5563)'
    );
  }

  const now = new Date();
  if (entry.vetoExpiresAt < now) {
    return htmlPage(
      'Ventana caducada — Isaak',
      '⏰ Ventana de cancelación caducada',
      `<p>El plazo de 48 horas para cancelar la presentación automática del <strong>Modelo 303 ${entry.periodo} ${entry.ejercicio}</strong> ya ha pasado.</p>
       <p>Si la presentación aún no se ha realizado, contacta con soporte para gestionarlo manualmente.</p>`,
      'linear-gradient(135deg,#78350f,#92400e)'
    );
  }

  // Apply the veto
  await prisma.isaakAutoSubmit303Queue.update({
    where: { id: entry.id },
    data: { status: 'vetoed', vetoedAt: now },
  });

  return htmlPage(
    'Presentación cancelada — Isaak',
    '✅ Presentación automática cancelada',
    `<p>Hemos cancelado la presentación automática del <strong>Modelo 303 ${entry.periodo} ${entry.ejercicio}</strong>.</p>
     <p>Isaak <strong>no</strong> presentará este 303 automáticamente. Si quieres presentarlo antes del plazo, puedes hacerlo manualmente desde Isaak.</p>`,
    'linear-gradient(135deg,#14532d,#15803d)'
  );
}
