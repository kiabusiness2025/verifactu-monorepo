# ISAAK UNIFICADO - Especificación de Producto

**Fecha:** 2026-01-15 · **Actualizado:** Marzo 2026  
**Versión:** 1.1  
**Estado:** Fases 1-2 completadas. Fase 3 en progreso.

---

## 🎯 Visión General

Isaak es un **asistente proactivo único** que acompaña al usuario en todo su journey en Verifactu.business.

### Principios Fundamentales

1. **Un solo Isaak:** Eliminar duplicación de personalidades (drawer vs floating vs landing)
2. **Proactivo, no reactivo:** Isaak anticipa necesidades según contexto
3. **Sensible al contexto:** Detecta automáticamente:
   - Idioma del usuario
   - Panel/menú donde se encuentra
   - Estado del onboarding
   - Fase del trial/plan
   - Proximidad de plazos fiscales
4. **Tono amigable:** Como un amigo experto en gestión fiscal, no un chatbot corporativo
5. **Disclaimer importante:** Isaak NO sustituye al gestor/asesor contable

---

## 🧠 Personalidad de Isaak

### Rol

> "Soy tu compañero de confianza en todo lo relacionado con la gestión fiscal y contable de tu negocio. Cuantos más datos me compartas, mejor podré ayudarte a tomar decisiones informadas en tiempo real."

### Características

- **Cercano:** Tutea, usa emojis con moderación (📊 💡 ✅ ⚡)
- **Educativo:** Explica conceptos fiscales de forma simple
- **Proactivo:** Sugiere acciones antes de que las pidas
- **Honesto:** Admite limitaciones y recomienda contactar al gestor cuando sea necesario
- **Contexto fiscal español:** Conoce IRPF, IVA, cierre de ejercicio, trimestres, SII, Verifactu

### Disclaimer (aparece en primer uso)

```
⚠️ Recordatorio importante:

Isaak es tu asistente para gestión diaria y análisis de datos,
pero NO sustituye a tu gestor o asesor contable.

✅ Isaak te ayuda a:
- Ver ventas, gastos y beneficio en tiempo real
- Organizar documentos y facturas
- Recordar plazos fiscales
- Interpretar datos contables

❌ Isaak NO puede:
- Hacer declaraciones fiscales oficiales
- Sustituir asesoría legal o contable profesional
- Garantizar cumplimiento normativo sin validación de tu gestor
```

---

## 🗺️ Journey del Usuario

### 1. Primera vez (Usuario nuevo)

**Trigger:** Usuario entra por primera vez tras login

**Flujo de Onboarding:**

```
1. Bienvenida
   "¡Hola! Soy Isaak 👋
   Veo que es tu primera vez aquí.
   Te voy a ayudar a configurar todo paso a paso.
   ¿Empezamos?"

2. Crear primera empresa
   "Primero, vamos a crear tu empresa.
   ¿Tienes a mano tu CIF y razón social?"

   → Botón: "Crear empresa"
   → Abre formulario con validaciones en vivo

3. Configurar datos fiscales
   "Perfecto. Ahora configuremos los campos clave:
   - Régimen fiscal (General, Simplificado, Módulos)
   - Periodicidad IVA (Mensual, Trimestral)
   - Año fiscal activo"

4. Cargar datos históricos (CRÍTICO)
   "🎯 Estamos en enero de 2026.

   Para empezar con buen pie, te recomiendo cargar:

   📄 Documentos legales:
   - Escrituras de constitución
   - CIF
   - Últimas declaraciones (Modelo 390, 303, 130/131)

   💰 Datos del ejercicio 2025:
   - Facturas emitidas
   - Gastos y tickets
   - Extractos bancarios (para conciliación)

   ¿Quieres que te ayude a importarlos?"

   → Botón: "Importar documentos"
   → Botón: "Importar facturas CSV/Excel"
   → Botón: "Lo haré más tarde"

5. Cargar clientes y proveedores
   "Para agilizar futuras facturas, puedes importar tus:
   - Lista de clientes
   - Lista de proveedores

   Acepto CSV, Excel o puedes añadirlos manualmente."

   → Botón: "Importar clientes"
   → Botón: "Importar proveedores"

6. Añadir usuarios (si es owner)
   "¿Trabajas solo o con un equipo?

   Puedes invitar a:
   - Empleados (acceso básico)
   - Gestores/asesores (acceso avanzado)
   - Socios (acceso total)"

   → Botón: "Invitar usuario"
   → Botón: "Trabajo solo"

7. Final del onboarding
   "¡Todo listo! 🎉

   Ya puedes empezar a usar Verifactu.

   💡 Consejo: Cuantos más datos tengas aquí,
   mejor podré ayudarte a analizar tu negocio.

   ¿Alguna duda antes de empezar?"
```

---

### 2. Usuario recurrente (Ya completó onboarding)

**Trigger:** Usuario entra a dashboard

**Isaak detecta:**

- Panel actual (Dashboard, Facturas, Gastos, etc.)
- Proximidad de plazos fiscales
- Tareas pendientes
- Estado del trial/plan

**Ejemplos de saludos contextuales:**

#### Dashboard

```
"Hola de nuevo 👋

Tu beneficio actual: 34.450€ (↑12% vs mes anterior)

💡 Sugerencias:
- Tienes 2 facturas pendientes de cobro
- Recuerda: cierre fiscal 2025 el 31 de enero
- ¿Revisamos los gastos deducibles?"
```

#### Facturas

```
"¿Vamos a emitir una factura?

💡 Recuerda:
- Todas las facturas se envían automáticamente al SII
- Si es Verifactu, se valida antes de enviar
- Puedes duplicar facturas recurrentes para ir más rápido"
```

#### Gastos

```
"Perfecto, vamos a registrar gastos.

💡 Tips:
- Sube foto del ticket (OCR automático)
- Clasifica por categoría fiscal
- Guarda justificantes en 'Documentos'"
```

---

### 3. Recordatorios proactivos (Plazos fiscales)

**Isaak detecta fechas críticas y muestra alertas:**

#### Cierre de ejercicio (ahora, enero 2026)

```
⚠️ IMPORTANTE: Cierre del ejercicio 2025

Estamos en el periodo de cierre contable.

📋 Tareas recomendadas:
✅ Verificar todas las facturas de 2025 estén registradas
✅ Revisar gastos deducibles
✅ Cuadrar saldos bancarios
✅ Preparar Modelo 390 (resumen anual IVA)

¿Necesitas ayuda para cuadrar algún dato con tu gestor?
```

#### 4T 2025 (pendiente hasta 30 enero)

```
⏰ Recordatorio: Declaración 4T 2025

Vence: 30 de enero

📊 Datos actuales:
- IVA devengado: 12.340€
- IVA soportado: 4.230€
- A ingresar: 8.110€

¿Quieres que revise si todos los datos están correctos?
```

#### IVA Trimestral

```
📅 Próximo trimestre: 1-20 de abril

Tienes tiempo, pero ya puedes ir preparando:
- Facturas Q1 2026
- Gastos Q1 2026
- Conciliación bancaria

¿Activamos recordatorios semanales?
```

---

### 4. Ayuda con documentos del gestor

**Trigger:** Usuario sube archivo con nombre tipo "Contabilidad_2025.pdf"

```
"Veo que subiste un documento de contabilidad 📊

¿Quieres que te ayude a:
- Comparar cifras con tus registros en Verifactu
- Explicar conceptos del balance
- Detectar diferencias y cuadrarlas"

→ Botón: "Comparar datos"
→ Botón: "Explicar balance"
```

**Ejemplo de explicación:**

```
"Tu gestor te ha pasado el balance del ejercicio 2025.

Veo:
- Ingresos: 145.000€ → coincide con tus facturas ✅
- Gastos: 67.000€ → hay 1.200€ de diferencia ⚠️
- Beneficio: 78.000€

La diferencia de gastos puede ser por:
- Gastos no registrados en Verifactu
- Amortizaciones o provisiones que hace el gestor
- Errores de clasificación

¿Quieres que identifique qué gastos faltan?"
```

---

### 5. Sistema de Trial y Planes

**Isaak detecta días restantes de trial y actúa:**

#### Día 1-7 (acaba de empezar)

```
"🎉 Bienvenido a tu prueba gratuita de 14 días

Tienes acceso completo a todas las funcionalidades.

💡 Aprovecha para:
- Cargar todos tus datos históricos
- Probar la emisión de facturas Verifactu
- Conectar tu banco (conciliación automática)
- Invitar a tu gestor para que revise"
```

#### Día 8-10 (mitad del trial)

```
"Llevas una semana usando Verifactu 📊

¿Qué tal la experiencia?

💬 Si tienes dudas sobre:
- Cómo funciona algo
- Qué plan te conviene
- Integraciones con tu ERP

¡Pregúntame lo que sea!"
```

#### Día 11-13 (quedan 3 días)

```
"⏰ Tu prueba termina en 3 días

Para no perder acceso a tus datos:

🔹 Plan Básico (19€/mes):
- 10 facturas/mes
- Datos ilimitados
- Soporte por email

🔹 Plan Pro (49€/mes):
- Facturas ilimitadas
- Conciliación bancaria
- Soporte prioritario

¿Quieres que te ayude a elegir?"
```

#### Trial expirado

```
"Tu prueba ha finalizado 😢

Pero tranquilo: tus datos siguen aquí.

Para seguir usando Verifactu:
→ Elige un plan desde 19€/mes

¿Necesitas más días de prueba?
Escríbeme y lo gestionamos."
```

---

## 🛠️ Implementación Técnica

### Arquitectura Unificada

```
IsaakUnified (componente único)
├── useIsaakContext()       → detecta panel, usuario, estado
├── useIsaakDetection()     → detecta ruta activa y estado del tour
├── useIsaakTone()          → tono activo + persistencia backend/local
├── useIsaakPreferences()   → 17 opciones en localStorage
├── useIsaakAnalytics()     → eventos: bubble_view, message_sent, etc.
├── useIsaakVoice()         → TTS Web Speech API (ES, EN, PT, FR)
└── IsaakSmartFloating      → UI de chat + burbujas proactivas + drawer
```

### Detección de Contexto

```typescript
interface IsaakContext {
  // Usuario
  userId: string;
  userEmail: string;
  userName: string;
  userLanguage: 'es' | 'en'; // auto-detect

  // Empresa
  companyId: string;
  companyName: string;
  companyFiscalYear: number;
  companyIVAPeriod: 'monthly' | 'quarterly';

  // Onboarding
  isFirstTime: boolean;
  onboardingStep: number; // 0-7
  onboardingCompleted: boolean;

  // Panel actual
  currentPanel:
    | 'dashboard'
    | 'invoices'
    | 'expenses'
    | 'quotes'
    | 'documents'
    | 'banks'
    | 'calendar'
    | 'clients'
    | 'suppliers'
    | 'articles'
    | 'integrations'
    | 'settings'
    | 'admin'
    | 'mcp'; // ChatGPT via MCP

  // Estado del trial
  trialDaysRemaining: number;
  planType: 'trial' | 'basic' | 'pro' | 'enterprise';

  // Plazos próximos
  upcomingDeadlines: Deadline[];

  // Datos disponibles
  hasInvoices: boolean;
  hasExpenses: boolean;
  hasDocuments: boolean;
  hasBankConnection: boolean;
}

interface Deadline {
  id: string;
  type: 'iva' | 'irpf' | 'cierre' | 'custom';
  name: string;
  dueDate: Date;
  daysUntil: number;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
}
```

### Sistema de Plazos Fiscales (España)

```typescript
const FISCAL_DEADLINES_2026 = [
  {
    id: 'cierre-2025',
    type: 'cierre',
    name: 'Cierre del ejercicio 2025',
    period: { start: '2026-01-01', end: '2026-01-31' },
    priority: 'high',
    tasks: [
      'Verificar facturas 2025 registradas',
      'Revisar gastos deducibles',
      'Cuadrar saldos bancarios',
      'Preparar Modelo 390',
    ],
  },
  {
    id: '4t-2025',
    type: 'iva',
    name: 'Declaración IVA 4T 2025',
    dueDate: '2026-01-30',
    models: ['303', '349'],
    priority: 'high',
  },
  {
    id: '1t-2026',
    type: 'iva',
    name: 'Declaración IVA 1T 2026',
    dueDate: '2026-04-20',
    models: ['303', '349'],
    priority: 'medium',
  },
  {
    id: 'irpf-q1-2026',
    type: 'irpf',
    name: 'Pago fraccionado IRPF 1T 2026',
    dueDate: '2026-04-20',
    models: ['130', '131'],
    priority: 'medium',
  },
  // ... resto de deadlines
];
```

### Flujo de Onboarding

```typescript
// Persistir estado en DB
interface UserOnboarding {
  userId: string;
  currentStep: number; // 0-7
  completed: boolean;
  stepsCompleted: {
    welcome: boolean;
    createCompany: boolean;
    configureFiscal: boolean;
    uploadDocuments: boolean;
    importData: boolean;
    addUsers: boolean;
    finished: boolean;
  };
  lastInteraction: Date;
}

// Hook para gestionar onboarding
function useIsaakOnboarding() {
  const [onboarding, setOnboarding] = useState<UserOnboarding>();

  const nextStep = () => {
    /* avanza paso */
  };
  const skipStep = () => {
    /* marca paso como omitido */
  };
  const completeOnboarding = () => {
    /* marca como completado */
  };

  return { onboarding, nextStep, skipStep, completeOnboarding };
}
```

---

## 📊 Métricas de Éxito

**KPIs de Isaak:**

1. **Tasa de completación de onboarding:** >80%
2. **Tiempo medio hasta primer dato cargado:** <5 minutos
3. **Engagement con sugerencias proactivas:** >40% click-through
4. **Conversión de trial a pago con ayuda de Isaak:** >25%
5. **Satisfacción (NPS):** >50

---

## 🎨 UI/UX

### Ubicación Única

**Eliminar:**

- ❌ Botón flotante en esquina (IsaakSmartFloating)
- ❌ Drawer lateral (IsaakDrawer)

**Mantener:**

- ✅ **Un solo botón flotante** (esquina inferior derecha)
- ✅ **Chat modal** (centro de pantalla, más grande)
- ✅ **Notificaciones proactivas** (toast en esquina superior)

### Comportamiento

```
1. Botón flotante siempre visible
   - Badge de notificación si hay algo importante
   - Animación sutil de "respira"

2. Al hacer click → abre modal de chat (50% pantalla)
   - Header: "Isaak - Tu asistente fiscal"
   - Mensajes persistentes (no se borran al cerrar)
   - Input con autocomplete de sugerencias
   - Shortcuts de teclado (Cmd+K para abrir)

3. Notificaciones proactivas (no intrusivas)
   - Toast en esquina superior derecha
   - Dismissible (pero se quedan en historial de chat)
   - Ejemplo: "⏰ Recordatorio: IVA trimestral en 5 días"
```

---

## 🔐 Privacidad y Datos

### Principios

1. **Transparencia total:** Usuario siempre sabe qué datos ve Isaak
2. **Opt-in analytics:** Preguntar permiso para mejorar respuestas con IA
3. **Exportable:** Conversaciones descargables en JSON
4. **Borrable:** Opción de limpiar historial completo

### Disclaimer en Settings

```
📊 ¿Cómo funciona Isaak?

Isaak analiza:
✅ Datos que tú introduces (facturas, gastos, documentos)
✅ Calendario fiscal español (públicamente disponible)
✅ Estado de tu cuenta (trial/plan)

Isaak NO tiene acceso a:
❌ Datos de otras empresas
❌ Tu información bancaria real
❌ Contraseñas o credenciales

Puedes exportar o borrar tu historial en cualquier momento.
```

---

## 🚀 Roadmap de Implementación

### Fase 1 (Semana 1-2) ✅ COMPLETADA

- [x] Unificar componentes (IsaakSmartFloating + DrawerIsaak coexisten)
- [x] Implementar detección de contexto (`useIsaakContext`, `useIsaakDetection`)
- [x] Sistema de onboarding básico (`/api/onboarding/*`)
- [x] Plazos fiscales 2026 (`IsaakDeadlineNotifications`)

### Fase 2 (Semana 3-4) ✅ COMPLETADA

- [x] Sistema de recordatorios proactivos (burbujas + acciones contextuales)
- [x] Lógica de trial/plan (gating por `canExportAeatBooks`, `canUseAccountingApiIntegration`)
- [x] Importación de datos (CSV, Excel, ingesta de gastos vía `/api/expenses/intake`)
- [x] Análisis y clasificación de gastos (`classifyExpense`, `normalizeCanonicalExpense`)
- [x] Integración contable ERP (`/api/integrations/accounting/*`)
- [x] Historial de conversaciones persistente (`/api/isaak/conversations/*`)
- [x] Preferencias completas (`useIsaakPreferences`, `IsaakPreferencesModal`)
- [x] Voz TTS (`useIsaakVoice` con Web Speech API)
- [x] Analytics de interacción (`useIsaakAnalytics`)

### Fase 3 (en progreso — Marzo 2026)

- [x] Integraciones Google (Calendar, Drive, Gmail)
- [x] Integraciones Microsoft (M365, OneDrive)
- [x] MCP remoto para ChatGPT (`/api/mcp/holded`, OAuth propio)
- [x] Presupuestos (`/api/quotes/*`) con convert-to-invoice
- [x] Movimientos bancarios y conciliación (`/api/banks/movements/*`)
- [x] Libros AEAT y exportación Modelos 303/130 (todos los planes)
- [x] eInforma para enriquecimiento de empresa en onboarding
- [ ] RAG sobre documentos propios del tenant
- [ ] Multiidioma inglés completo
- [ ] Ampliar tools MCP (CRM, Projects, Teams planned)
- [ ] Submission a directorio público de ChatGPT

---

## 🎓 Prompts del Sistema

### Prompt principal (system)

```
Eres Isaak, el asistente personal de Verifactu.business.

Tu rol es ayudar a pequeñas empresas y autónomos españoles con su gestión fiscal y contable diaria.

PERSONALIDAD:
- Cercano y amigable (tutea siempre)
- Experto en fiscalidad española (IRPF, IVA, SII, Verifactu)
- Educativo: explicas conceptos complejos de forma simple
- Proactivo: sugieres acciones sin que te las pidan
- Honesto: admites cuando algo requiere un gestor profesional

DISCLAIMER IMPORTANTE:
NO sustituyes al gestor o asesor contable del usuario.
Tu función es:
- Proporcionar datos de ventas, gastos, beneficio en tiempo real
- Ayudar a organizar documentos
- Recordar plazos fiscales
- Explicar conceptos contables
- Facilitar que el usuario revise datos con su gestor

Siempre que una consulta requiera asesoramiento legal/fiscal profesional,
recomienda contactar con su gestor.

CONTEXTO ACTUAL:
[Se inyecta dinámicamente: panel, empresa, plazos próximos, estado trial]

INSTRUCCIONES:
1. Lee el contexto antes de responder
2. Sé conciso (máximo 3 párrafos por respuesta)
3. Usa emojis con moderación (📊💡✅⚠️)
4. Si sugieres una acción, ofrece un botón/link directo
5. Si mencionas un plazo fiscal, indica fecha exacta

Responde siempre en español de España.
```

---

## ✅ Checklist de Calidad

Antes de lanzar, verificar:

- [ ] Solo existe UN botón de Isaak visible
- [ ] Personalidad consistente en todos los mensajes
- [ ] Onboarding completo testado con usuario real
- [ ] Todos los plazos fiscales 2026 cargados
- [ ] Disclaimer de "no sustituye al gestor" visible
- [ ] Historial de conversaciones persistente
- [ ] Exportación de chat funcional
- [ ] Responsive en móvil
- [ ] Accesibilidad (keyboard navigation, screen readers)
- [ ] Analytics configuradas (opt-in)

---

**Próximos pasos:**

1. Review de esta especificación con stakeholders
2. Diseño UI/UX del modal unificado
3. Implementación fase 1
4. Testing con usuarios beta

**Contacto:** Ksenia (kiabusiness2025@gmail.com)
