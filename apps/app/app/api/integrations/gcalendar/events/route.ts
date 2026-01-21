import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API para listar eventos de Google Calendar (ejemplo)
 * GET /api/integrations/gcalendar/events
 */
export async function GET(req: Request) {
  try {
    // TODO: Obtener access_token desde la base de datos
    // const session = await getServerSession();
    // const integration = await getUserIntegration(session.user.id, 'gcalendar');

    // Ejemplo de respuesta
    return NextResponse.json({
      ok: true,
      message: 'Conecta Google Calendar desde Settings > Integraciones',
      events: [],
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ ok: false, error: 'Error al obtener eventos' }, { status: 500 });
  }
}

/**
 * API para crear evento en Google Calendar
 * POST /api/integrations/gcalendar/events
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { summary, description, start, end, attendees } = body;

    if (!summary || !start || !end) {
      return NextResponse.json({ ok: false, error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // TODO: Obtener access_token y crear evento
    // const session = await getServerSession();
    // const integration = await getUserIntegration(session.user.id, 'gcalendar');

    // const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${integration.accessToken}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     summary,
    //     description,
    //     start: { dateTime: start, timeZone: 'Europe/Madrid' },
    //     end: { dateTime: end, timeZone: 'Europe/Madrid' },
    //     attendees: attendees?.map((email: string) => ({ email })),
    //   }),
    // });

    return NextResponse.json({
      ok: true,
      message: 'Evento creado correctamente',
      event: { id: 'example-id', summary, start, end },
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ ok: false, error: 'Error al crear evento' }, { status: 500 });
  }
}
