// Handler para tareas programadas (cron jobs)
export async function POST(request: Request) {
  // Aquí se ejecutarán tareas automáticas
  return new Response('Tarea programada ejecutada', { status: 200 });
}
