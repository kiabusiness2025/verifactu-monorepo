import { NextResponse } from "next/server";
import { isaakChat, type AIModel } from "@/lib/genkit-hybrid";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt : undefined;
    const message = typeof body?.message === "string" ? body.message : undefined;
    const input = (prompt ?? message ?? "").trim();

    // Permitir especificar modelo: 'gemini-flash', 'gpt-4', o 'auto' (default)
    const modelPreference = (body?.model as AIModel) || "auto";

    if (!input) {
      return NextResponse.json(
        {
          text: "Escribe tu pregunta para que Isaak pueda ayudarte.",
          response: "Escribe tu pregunta para que Isaak pueda ayudarte.",
        },
        { status: 400 }
      );
    }

    // Usar sistema hibrido de IA
    const { text, model } = await isaakChat(input, modelPreference);

    return NextResponse.json({
      text,
      response: text,
      metadata: {
        model,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    return NextResponse.json(
      {
        text: "Ahora mismo no puedo responder. Intentalo de nuevo en unos segundos.",
        response:
          "Ahora mismo no puedo responder. Intentalo de nuevo en unos segundos.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
