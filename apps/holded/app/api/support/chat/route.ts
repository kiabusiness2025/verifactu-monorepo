import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function buildReply(input: { message: string; source?: string | null; digest?: string | null }) {
  const text = input.message.toLowerCase();
  const context = [
    input.source ? `Pantalla de origen: ${input.source}.` : null,
    input.digest ? `Codigo de referencia: ${input.digest}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  if (text.includes('api') || text.includes('holded') || text.includes('desarrollador')) {
    return `Vamos por la API key. Entra en Holded > Configuracion > Mas > Desarrolladores, pulsa "+ Nueva API Key", pon como nombre ISAAK_HOLDED_API_KEY y pega la clave aqui. Si no ves "Desarrolladores", tu usuario probablemente no tiene permisos suficientes o tu plan es Free. Guia oficial de Holded: https://help.holded.com/es/articles/6896051-como-generar-y-usar-la-api-de-holded ${context}`.trim();
  }

  if (text.includes('correo') || text.includes('verificacion') || text.includes('email')) {
    return `Si no ves el correo de verificacion, revisa spam y promociones. Si han pasado unos minutos, vuelve al acceso con el mismo email e intenta iniciar sesion para forzar el siguiente paso. Si el correo sigue sin llegar, escribenos a soporte@verifactu.business indicando el email usado. ${context}`.trim();
  }

  if (
    text.includes('no puedo entrar') ||
    text.includes('acceso') ||
    text.includes('login') ||
    text.includes('contrase')
  ) {
    return `Si el bloqueo ocurre al entrar, prueba en este orden: 1. recarga la pagina, 2. vuelve a /auth/holded con el mismo correo, 3. si estabas ya conectado antes, entra a /onboarding/holded para rehacer el ultimo paso. Si vuelve a salir un codigo de referencia, mandanos ese codigo y el email usado a soporte@verifactu.business. ${context}`.trim();
  }

  if (
    text.includes('conectar') ||
    text.includes('conexion') ||
    text.includes('error') ||
    text.includes('dashboard')
  ) {
    return `Ese tipo de fallo suele quedar entre la validacion de la API key y la entrada al dashboard. Lo mas util es repetir el paso de conectar desde /onboarding/holded y, si vuelve a fallar, abrir soporte con el codigo de referencia y el email usado. ${context}`.trim();
  }

  return `Puedo ayudarte mejor si me dices una de estas cuatro cosas: si el fallo es al crear acceso, al verificar el correo, al conectar Holded o al entrar al dashboard. ${context}`.trim();
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const source = typeof body?.source === 'string' ? body.source.trim() : '';
  const digest = typeof body?.digest === 'string' ? body.digest.trim() : '';

  if (!message) {
    return NextResponse.json({ error: 'Escribe tu duda para continuar.' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    reply: buildReply({
      message,
      source: source || null,
      digest: digest || null,
    }),
  });
}
