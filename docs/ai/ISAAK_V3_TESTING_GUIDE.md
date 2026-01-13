# ISAAK V3.0 - Quick Reference Guide

## 🚀 Para Empezar a Testear

### 1. Abre el dashboard
```
http://localhost:3000/app/dashboard
```

### 2. ¿Dónde está cada feature?

| Feature | Dónde | Cómo acceder |
|---------|-------|-------------|
| **Analytics** | localStorage | DevTools → Storage → LocalStorage → `isaak_analytics` |
| **Historial** | localStorage | DevTools → Storage → LocalStorage → `isaak_conversation_history` |
| **Deadlines** | Top-right | Automático en dashboard |
| **Voz** | En chat | Habilitar en Preferencias → Voz |
| **Preferencias** | Modal | Footer → "Preferencias Isaak" |

---

## 🎯 Checklist de Testing Rápido

### Analytics ✅
```
[ ] Abre DevTools (F12)
[ ] Vé a Storage → LocalStorage → isaak_analytics
[ ] Envía un mensaje en Isaak
[ ] Verifica que apareció: "message_sent"
[ ] Exporta analytics (botón en... próximamente)
```

### Historial ✅
```
[ ] Abre chat
[ ] Envía mensaje: "¿Qué es IVA?"
[ ] Devtools → Storage → isaak_conversation_history
[ ] Verifica que está el mensaje guardado
[ ] Cierra chat
[ ] Reabre chat
[ ] ¡El mensaje sigue ahí!
```

### Deadlines ✅
```
[ ] Abre dashboard
[ ] Mira arriba a la derecha
[ ] Deberías ver notificaciones de deadlines
[ ] Haz clic en X para descartar
[ ] Espera 1 hora (en dev puedes simular)
```

### Voz ✅
```
[ ] Abre Preferencias → Voz tab
[ ] Habilita "Habilitar voz"
[ ] Ajusta rate a 1.5x (más rápido)
[ ] Haz clic "Escuchar prueba"
[ ] ¡Escucharás a Isaak hablar!
[ ] Vuelve a chat y envía pregunta
[ ] Respuesta se reproduce automáticamente
```

### Preferencias ✅
```
[ ] Footer → "Preferencias Isaak"
[ ] Modal se abre con 5 tabs
[ ] Tab Burbujas:
    - Desactiva "Habilitar burbujas"
    - Refresca página
    - ¡No aparecen burbujas!
[ ] Tab Chat:
    - Cambia tema a "Oscuro"
    - Refresca
    - ¡Chat está oscuro!
[ ] Tab Voz:
    - Rate slider a 1.5x
    - Pitch slider a 0.8x
    - Test button para escuchar
[ ] Tab Privacidad:
    - Export preferences → JSON descargado
    - Reset to defaults → Todo vuelve normal
```

---

## 📂 Estructura de Archivos (Nueva)

```
apps/app/
├── hooks/
│   ├── useIsaakAnalytics.ts          ← Track eventos
│   ├── useConversationHistory.ts     ← Guardar chats
│   ├── useDeadlineNotifications.ts   ← Alertas
│   ├── useIsaakVoice.ts              ← TTS
│   ├── useIsaakPreferences.ts        ← Preferencias
│   ├── useIsaakDetection.ts          (ya existía)
│   └── useProactiveMessages.ts       (ya existía)
│
├── lib/
│   ├── isaak-messages-i18n.ts        (ya existía)
│   └── isaak-floating-contexts-i18n.ts (ya existía)
│
├── components/isaak/
│   ├── IsaakSmartFloating.tsx        ← MEJORADO
│   ├── IsaakProactiveBubbles.tsx     ← MEJORADO
│   ├── IsaakPreferencesModal.tsx     ← NUEVO
│   └── IsaakDeadlineNotifications.tsx ← NUEVO
│
└── app/dashboard/
    └── layout.tsx                    ← MEJORADO
```

---

## 🔍 Debugging con DevTools

### Ver Analytics en tiempo real
```javascript
// En Console:
const analytics = JSON.parse(localStorage.getItem('isaak_analytics'))
console.log(analytics)
// Muestra: [{ timestamp: "2024-01-12T...", type: "message_sent", ... }, ...]
```

### Ver Historial de conversaciones
```javascript
// En Console:
const history = JSON.parse(localStorage.getItem('isaak_conversation_history'))
console.log(history)
// Muestra: [{ id: "session_123", messages: [...], ... }, ...]
```

### Ver Preferencias actuales
```javascript
// En Console:
const prefs = JSON.parse(localStorage.getItem('isaak_preferences'))
console.log(prefs)
// Muestra: { bubblesEnabled: true, chatEnabled: false, ... }
```

### Limpiar todo (reset)
```javascript
// En Console:
localStorage.removeItem('isaak_analytics')
localStorage.removeItem('isaak_conversation_history')
localStorage.removeItem('isaak_deadlines')
localStorage.removeItem('isaak_preferences')
localStorage.removeItem('isaak_voice_config')
location.reload() // Refresca y reinicia Isaak
```

---

## 🎓 Explicación por Feature

### useIsaakAnalytics
```typescript
// Qué trackea:
bubble_view       ← El usuario ve una notificación
bubble_click      ← El usuario hace clic
chat_open         ← Abre la ventana de chat
message_sent      ← Envía un mensaje
suggestion_click  ← Usa una sugerencia rápida
voice_start       ← Empieza a hablar
voice_end         ← Termina de hablar

// Acceso:
import { useIsaakAnalytics } from '@/hooks/useIsaakAnalytics'
const { trackEvent, getAnalyticsSummary } = useIsaakAnalytics()

// Trackear evento:
trackEvent({ type: 'message_sent', context: 'dashboard' })

// Obtener métricas:
const summary = getAnalyticsSummary()
// Returns: { totalEvents: 42, bubbleViews: 5, chatOpens: 3, ... }
```

### useConversationHistory
```typescript
// Qué guarda:
- Todas las conversaciones
- Cada mensaje con timestamp
- Metadatos (contexto, rol)
- Búsqueda full-text

// Acceso:
import { useConversationHistory } from '@/hooks/useConversationHistory'
const { startNewSession, addMessage, searchSessions } = useConversationHistory()

// Crear nueva sesión:
const sessionId = startNewSession('dashboard', 'user')

// Guardar mensaje:
addMessage({ role: 'user', content: '¿Qué es IVA?', timestamp: new Date() }, sessionId)

// Buscar:
const found = searchSessions('impuestos')
// Returns: [{ id: "session_123", messages: [...], ... }, ...]
```

### useDeadlineNotifications
```typescript
// Qué alerta:
IVA Trimestral (20 de abril, julio, octubre)
Declaración de Renta (30 de junio)
Impuesto Sociedades (25 de abril)
Deadlines personalizados

// Acceso:
import { useDeadlineNotifications } from '@/hooks/useDeadlineNotifications'
const { addDeadline, getUpcomingDeadlines } = useDeadlineNotifications()

// Agregar deadline:
addDeadline({
  title: 'Auditoría',
  date: new Date(2024, 2, 15),
  type: 'custom',
  priority: 'high'
})

// Próximos 30 días:
const upcoming = getUpcomingDeadlines(30)
// Returns: [{ title, date, priority, ... }, ...]
```

### useIsaakVoice
```typescript
// Qué soporta:
- Español (es-ES)
- English (en-US)
- Português (pt-BR)
- Français (fr-FR)

// Acceso:
import { useIsaakVoice } from '@/hooks/useIsaakVoice'
const { speak, stop, isSpeaking } = useIsaakVoice()

// Hablar:
speak('El IVA es un impuesto indirecto', 'es')

// Controles:
const config = {
  enabled: true,
  rate: 1.5,        // 0.5x a 2x
  pitch: 0.9,       // 0.5x a 2x
  volume: 1.0,      // 0 a 1
  language: 'es'    // es, en, pt, fr
}
saveVoiceConfig(config)
```

### useIsaakPreferences
```typescript
// Qué guarda:
17 preferencias del usuario

// Acceso:
import { useIsaakPreferences } from '@/hooks/useIsaakPreferences'
const { preferences, updatePreference } = useIsaakPreferences()

// Cambiar una preferencia:
updatePreference('bubblesEnabled', false)
updatePreference('voiceRate', 1.5)
updatePreference('chatTheme', 'dark')

// Cambiar múltiples:
updatePreferences({
  voiceEnabled: true,
  voiceRate: 1.5,
  chatTheme: 'dark'
})

// Export/import:
exportPreferences() // Descarga JSON
importPreferences(file) // Sube JSON
```

---

## 🧪 Escenarios de Testing

### Escenario 1: Usuario que vuelve
```
1. Usuario A abre dashboard
   └─ Se crean preferencias por defecto
2. Usuario A desactiva burbujas
   └─ bubblesEnabled = false guardado
3. Cierra navegador
4. Reabre navegador
5. Las burbujas siguen desactivadas ✅
```

### Escenario 2: Seguimiento de engagement
```
1. Usuario B abre chat (TRACKED: chat_open)
2. Envía 3 mensajes (TRACKED: 3x message_sent)
3. Hace clic en 1 sugerencia (TRACKED: suggestion_click)
4. Admin revisa analytics:
   └─ 1 chat_open, 3 message_sent, 1 suggestion_click ✅
```

### Escenario 3: Continuidad de conversación
```
1. Usuario C pregunta "¿Qué es IVA?"
   └─ Guardado en session_123
2. Recibe respuesta largo sobre IVA
3. Cierra chat
4. Reabre chat 1 hora después
5. Continúa preguntando sobre IVA
   └─ Sistema recuerda contexto ✅
```

### Escenario 4: Accesibilidad con voz
```
1. Usuario D habilita voz en preferencias
2. Ajusta rate a 1.3x (poco más rápido)
3. Cambia pitch a 0.9x (un poco más grave)
4. Pregunta: "¿Cómo calcular beneficios?"
5. Respuesta se habla automáticamente ✅
```

### Escenario 5: Deadlines críticos
```
1. Abril 20 (Vencimiento IVA Q1)
2. Usuario E abierto dashboard
3. Top-right muestra notificación ROJA ✅
4. Usuario E hace clic en X para descartar
5. Notificación desaparece
```

---

## 📋 Comandos Útiles

### Resetear Isaak completamente
```javascript
// Console:
['isaak_analytics', 'isaak_conversation_history', 'isaak_deadlines', 'isaak_preferences', 'isaak_voice_config'].forEach(key => localStorage.removeItem(key))
location.reload()
```

### Ver todos los datos de Isaak
```javascript
// Console:
console.log('Analytics:', JSON.parse(localStorage.getItem('isaak_analytics')))
console.log('History:', JSON.parse(localStorage.getItem('isaak_conversation_history')))
console.log('Deadlines:', JSON.parse(localStorage.getItem('isaak_deadlines')))
console.log('Preferences:', JSON.parse(localStorage.getItem('isaak_preferences')))
console.log('Voice:', JSON.parse(localStorage.getItem('isaak_voice_config')))
```

### Simular evento de analytics
```javascript
// Console:
const event = {
  type: 'test_event',
  context: 'dashboard',
  role: 'user',
  timestamp: new Date()
}
const existing = JSON.parse(localStorage.getItem('isaak_analytics') || '[]')
existing.push(event)
localStorage.setItem('isaak_analytics', JSON.stringify(existing))
console.log('Evento simulado:', event)
```

---

## 🐛 Troubleshooting

### "Las burbujas siguen apareciendo aunque las deshabilité"
```
Solución:
1. DevTools → Storage → LocalStorage
2. Busca isaak_preferences
3. Verifica que bubblesEnabled = false
4. Si no, elimina la clave y refresca
```

### "La voz no funciona"
```
Posibles causas:
1. browser no soporta Web Speech API
   → Prueba en Chrome/Firefox (Safari limitado)
2. voiceEnabled = false en preferencias
   → Habilita en modal
3. Sin sonido en dispositivo
   → Verifica volumen del sistema
```

### "Historial desaparece"
```
Causas:
1. localStorage vacío (usuario limpió)
2. 50 sesiones máx alcanzadas
3. Navegador en modo incógnito
   → No persiste localStorage

Solución:
→ En modo incógnito, localStorage no funciona
→ Usa navegación normal
```

### "Deadlines no aparecen"
```
Solución:
1. Verifica que estés en dashboard (no landing)
2. IsaakDeadlineNotifications solo en dashboard
3. Revisa DevTools → Network → No errors
4. Refresca página
```

---

## 📞 Support

Si algo no funciona:

1. Abre DevTools (F12)
2. Ve a Console
3. Copia cualquier error
4. Cuéntame qué intentabas hacer
5. Cuál es el error exacto

```javascript
// Ejemplo útil:
console.log({
  currentPreferences: JSON.parse(localStorage.getItem('isaak_preferences')),
  analyticsCount: JSON.parse(localStorage.getItem('isaak_analytics'))?.length,
  historyCount: JSON.parse(localStorage.getItem('isaak_conversation_history'))?.length
})
```

---

## ✨ ¡A disfrutar Isaak v3.0!

Prueba todos los features y cuéntame cómo te va! 🚀
