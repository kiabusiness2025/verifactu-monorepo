/**
 * Configuración de Genkit AI con Firebase Telemetry
 * 
 * Este archivo habilita telemetría con Firebase y proporciona
 * una función para chat con Isaak usando Google AI (Gemini).
 */

import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Habilitar telemetría de Firebase
try {
  enableFirebaseTelemetry({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
} catch (error) {
  console.warn('Firebase telemetry no pudo inicializarse:', error);
}

// Cliente de Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Función helper para chat con Isaak usando Gemini
export async function isaakChat(userMessage: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Eres Isaak, un asistente experto en contabilidad, fiscalidad y VeriFactu en España.
Tu objetivo es ayudar a autónomos y pequeñas empresas a entender sus obligaciones fiscales con un tono calmado y cercano.

Contexto del usuario:
- Usa Verifactu Business para gestionar ventas, gastos y beneficios
- Necesita cumplir con la normativa VeriFactu de la AEAT
- Busca tranquilidad y claridad, no tecnicismos complejos

Usuario pregunta: ${userMessage}

Responde de forma clara, directa y tranquilizadora. Si no conoces la respuesta exacta, indícalo y sugiere consultar con un asesor.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error en isaakChat:', error);
    throw error;
  }
}
