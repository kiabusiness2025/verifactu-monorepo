import { NextResponse } from "next/server";
import { isaakChat } from "@/lib/genkit";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt : undefined;
    const message = typeof body?.message === "string" ? body.message : undefined;
    const input = (prompt ?? message ?? "").trim();

    if (!input) {
      return NextResponse.json(
        { text: "Escribe tu pregunta para que Isaak pueda ayudarte.", response: "Escribe tu pregunta para que Isaak pueda ayudarte." },
        { status: 400 }
      );
    }

    // Usar Genkit para procesar la consulta
    const text = await isaakChat(input);

    return NextResponse.json({ text, response: text });

  } catch (error) {
    console.error("Error en /api/chat:", error);
    return NextResponse.json(
      { text: "Ahora mismo no puedo responder. Inténtalo de nuevo en unos segundos.", response: "Ahora mismo no puedo responder. Inténtalo de nuevo en unos segundos." },
      { status: 500 }
    );
  }
}