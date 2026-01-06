import { NextResponse } from "next/server";

// Prefer server-only env vars; fallback to NEXT_PUBLIC for compatibility
const ISAAK_API_KEY = process.env.ISAAK_API_KEY || process.env.NEXT_PUBLIC_ISAAK_API_KEY;
const ISAAK_ASSISTANT_ID = process.env.ISAAK_ASSISTANT_ID || process.env.NEXT_PUBLIC_ISAAK_ASSISTANT_ID;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt : undefined;
    const message = typeof body?.message === "string" ? body.message : undefined;
    const input = (prompt ?? message ?? "").trim();

    if (!ISAAK_API_KEY || !ISAAK_ASSISTANT_ID) {
      return NextResponse.json(
        { text: "La configuración de Isaak no está completa.", response: "La configuración de Isaak no está completa." },
        { status: 500 }
      );
    }

    if (!input) {
      return NextResponse.json(
        { text: "Escribe tu pregunta para que Isaak pueda ayudarte.", response: "Escribe tu pregunta para que Isaak pueda ayudarte." },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", { // Endpoint corregido a un estándar de OpenAI
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ISAAK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo", // Modelo actualizado
        // La API de chat/completions no usa assistant_id directamente en el body.
        // La lógica para usar un asistente específico es más compleja.
        // Por simplicidad, aquí se hace una llamada de chat normal.
        messages: [{ role: "user", content: input }],
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "No he podido procesar tu solicitud.";

    return NextResponse.json({ text, response: text });

  } catch (error) {
    console.error("Error en /api/chat:", error);
    return NextResponse.json(
      { text: "Ahora mismo no puedo responder. Inténtalo de nuevo en unos segundos.", response: "Ahora mismo no puedo responder. Inténtalo de nuevo en unos segundos." },
      { status: 500 }
    );
  }
}