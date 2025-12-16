import { NextResponse } from "next/server";

const ISAAC_API_KEY = process.env.NEXT_PUBLIC_ISAAC_API_KEY;
const ISAAC_ASSISTANT_ID = process.env.NEXT_PUBLIC_ISAAC_ASSISTANT_ID;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!ISAAC_API_KEY || !ISAAC_ASSISTANT_ID) {
      return NextResponse.json({ text: "La configuración del asistente IA no está completa." }, { status: 500 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", { // Endpoint corregido a un estándar de OpenAI
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ISAAC_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo", // Modelo actualizado
        // La API de chat/completions no usa assistant_id directamente en el body.
        // La lógica para usar un asistente específico es más compleja.
        // Por simplicidad, aquí se hace una llamada de chat normal.
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "No he podido procesar tu solicitud.";

    return NextResponse.json({ text });

  } catch (error) {
    console.error("Error en /api/chat:", error);
    return NextResponse.json({ text: "Error de comunicación con el asistente." }, { status: 500 });
  }
}