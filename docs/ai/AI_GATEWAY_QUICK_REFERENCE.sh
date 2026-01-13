#!/usr/bin/env bash
# Quick Reference: AI Gateway Integration

cat << 'EOF'
╔════════════════════════════════════════════════════════════════╗
║         VERCEL AI GATEWAY - QUICK REFERENCE                    ║
╚════════════════════════════════════════════════════════════════╝

🔑 CLAVE API
────────────────────────────────────────────────────────────────
  vck_5EGDA4EFpVotU1VYVM9OZ2P3zFYpr01oJG2fKCKd0dWYN2kwqn1HR4qa
  
  Guardada en: .env.local como CLAVE_API_AI_VERCEL
  Tipo: Token de Vercel AI Gateway
  Válido: ✅ Activo

📡 ENDPOINTS
────────────────────────────────────────────────────────────────
  Base URL: https://ai-gateway.vercel.sh/v1
  
  Chat endpoint: POST /api/chat
  - Dashboard: /app/api/chat
  - Landing: (usa OpenAI directo)

🎯 MODELOS ACTIVOS
────────────────────────────────────────────────────────────────
  RECOMENDADO para Isaak:
  └─ openai/gpt-4-turbo
     • Análisis contable complejo ✅
     • Context: 128,000 tokens
     • Latencia: ~1-2 segundos
     • Costo: $0.01 entrada / $0.03 salida (por 1K tokens)

  ALTERNATIVAS:
  ├─ openai/gpt-3.5-turbo (rápido, económico)
  ├─ anthropic/claude-3-opus (mejor reasoning)
  ├─ anthropic/claude-3-sonnet (balance)
  ├─ anthropic/claude-3-haiku (más rápido)
  ├─ xai/grok-2 (reasoning avanzado)
  └─ google/gemini-pro (económico)

🔧 CÓDIGO: USAR EN API ROUTE
────────────────────────────────────────────────────────────────
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const apiKey = process.env.CLAVE_API_AI_VERCEL;
  
  const aiClient = createOpenAI({
    apiKey,
    baseURL: 'https://ai-gateway.vercel.sh/v1',
  });

  const { messages } = await req.json();

  const result = await streamText({
    model: aiClient('openai/gpt-4-turbo'),
    system: 'Eres Isaak, asistente de contabilidad...',
    messages,
  });

  return result.toDataStreamResponse();
}

📊 CAMBIAR DE MODELO (sin redeploy)
────────────────────────────────────────────────────────────────
// Opción 1: Cambiar el nombre en el código
model: aiClient('anthropic/claude-3-opus'),

// Opción 2: Por contexto
const models = {
  'dashboard': 'openai/gpt-4-turbo',
  'landing': 'openai/gpt-3.5-turbo',
  'admin': 'anthropic/claude-3-opus',
};
model: aiClient(models[contextType]),

// Opción 3: Variable de entorno
model: aiClient(process.env.AI_MODEL || 'openai/gpt-4-turbo'),

👁️ VER LOGS
────────────────────────────────────────────────────────────────
1. Abrir: https://vercel.com/dashboard
2. Proyecto: verifactu-monorepo
3. Menú izquierdo: AI Gateway
4. Ver:
   • Solicitudes en tiempo real
   • Costos por modelo
   • Latencia y errores
   • Uso total

📈 ANALIZAR COSTOS
────────────────────────────────────────────────────────────────
GPT-4 Turbo:
  Entrada:  $0.01  / 1000 tokens
  Salida:   $0.03  / 1000 tokens
  Ejemplo:  100 tokens entrada + 150 salida = $0.0055

Claude 3 Sonnet:
  Entrada:  $0.003 / 1000 tokens
  Salida:   $0.015 / 1000 tokens
  Ejemplo:  100 + 150 tokens = $0.00285 (50% más barato)

⚡ OPTIMIZACIÓN
────────────────────────────────────────────────────────────────
• Usar Claude 3 Haiku para respuestas rápidas (80% más barato)
• Implementar caché para prompts comunes
• Reducir tokens de contexto en system prompts
• A/B Testing: GPT-4 vs Claude 3 Sonnet

❌ TROUBLESHOOTING
────────────────────────────────────────────────────────────────
"Invalid API Key"
  → Verificar en https://vercel.com/dashboard/account/integrations
  → Regenerar si es necesario

"Rate Limit Exceeded"
  → Vercel limita automáticamente
  → Ver límite en dashboard
  → Contactar Vercel para aumentar

"Model not found"
  → Usar nombre completo: "openai/gpt-4-turbo"
  → No usar solo "gpt-4-turbo"

🎓 RECURSOS
────────────────────────────────────────────────────────────────
Docs:      https://vercel.com/docs/ai-gateway
Dashboard: https://vercel.com/dashboard/ai-gateway
Modelos:   https://vercel.com/docs/ai-gateway#models
Precios:   https://vercel.com/docs/ai-gateway#pricing

✅ ESTADO ACTUAL
────────────────────────────────────────────────────────────────
[✅] Clave API configurada
[✅] /api/chat integrado
[✅] Documentación creada
[✅] Logs en Vercel accesibles
[⏳] Próximo: Monitorear costos y hacer A/B testing

EOF
