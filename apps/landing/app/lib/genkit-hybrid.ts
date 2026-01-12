export type AIModel = "auto" | "gemini-flash" | "gpt-4";

export async function isaakChat(
  prompt: string,
  model: AIModel = "auto"
): Promise<{ text: string; model: AIModel }> {
  const cleaned = prompt.trim();
  if (!cleaned) {
    return {
      text: "Escribe tu pregunta y te ayudo enseguida.",
      model,
    };
  }

  return {
    text: "Gracias. Estoy preparando una respuesta clara y util para tu caso.",
    model,
  };
}
