import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

function readGoogleAiApiKey() {
  return (
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    process.env.GOOGLEAI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    ''
  );
}

const googleAiApiKey = readGoogleAiApiKey();

export const isGenkitConfigured = Boolean(googleAiApiKey);

export const ai = genkit({
  plugins: googleAiApiKey
    ? [
        googleAI({
          apiKey: googleAiApiKey,
        }),
      ]
    : [],
});

export function assertGenkitConfigured() {
  if (isGenkitConfigured) return;

  throw new Error(
    'Genkit no esta configurado. Define GOOGLE_AI_API_KEY, GOOGLEAI_API_KEY o GEMINI_API_KEY en el entorno de Isaak.'
  );
}

export default ai;
