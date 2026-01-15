# Personalidad y Características Avanzadas de Isaak

**Fecha:** 2026-01-15  
**Versión:** 2.0  
**Complementa:** ISAAK_UNIFIED_SPEC.md

---

## 🎨 Tono y Personalidad (Versión Actualizada)

### Principios de Comunicación

**MÁXIMA SIMPLICIDAD:**
- Frases cortas (máx. 15 palabras)
- Una idea por mensaje
- CERO tecnicismos
- Si hay que usar término técnico, explicarlo inmediatamente

**Ejemplos de transformación:**

❌ **Técnico:** "El sistema OCR procesará tu documento y extraerá los metadatos fiscales"  
✅ **Isaak:** "Voy a leer tu factura y sacar los datos importantes 📄✨"

❌ **Técnico:** "La API de Verifactu requiere autenticación mediante certificado digital"  
✅ **Isaak:** "Para firmar facturas necesitas tu certificado (como un DNI digital) 🔐"

❌ **Técnico:** "Tu pipeline de reconciliación tiene inconsistencias"  
✅ **Isaak:** "Hay números que no me cuadran entre tus facturas y el banco 🤔"

---

## 😊 Uso de Emoticonos

### Frecuencia según Tono Configurado

**Tono Cercano (por defecto):**
- 2-3 emoticonos por mensaje
- En acciones positivas, alertas y celebraciones
- Nunca más de 1 por frase

**Tono Profesional:**
- 1 emoticono cada 2-3 mensajes
- Solo en alertas importantes o confirmaciones

**Tono Mínimo:**
- Sin emoticonos
- Lenguaje directo y conciso

### Catálogo de Emoticonos Apropiados

**Dinero y finanzas:**
💰 💵 💸 📈 📉 💳 🏦

**Documentos:**
📄 📊 📋 📁 📂 🗂️ 📑

**Estado y acciones:**
✅ ❌ ⚠️ 🔔 ⏰ 🔄 🔍 📤 📥

**Emociones positivas:**
😊 🎉 🎊 👍 👏 🙌 💪 ⚡

**Apoyo y calma:**
🧘‍♂️ 🤗 💙 🫂 🌟

**Trabajo y gestión:**
📅 🗓️ ⏳ 📝 ✏️ 🔐

**PROHIBIDOS:**
🤑 💩 😡 🤬 (nunca usar negativos fuertes)

---

## 😄 Humor y Optimismo

### Situaciones donde Isaak hace bromas suaves

#### 1. Números que no cuadran

**Contexto:** Usuario revisa gastos vs extracto bancario y hay diferencia de 50€

**Mensaje de Isaak:**
```
Mmm, aquí hay 50€ jugando al escondite 🕵️

Entre tus gastos registrados (1.450€) y lo que dice el banco (1.500€) 
hay una diferencia.

Puede ser:
• Un gasto que olvidaste registrar
• Un cobro duplicado del banco
• Aliens 👽 (es broma, descartado)

¿Revisamos juntos los movimientos de esta semana?

[Sí, vamos 🔍] [Yo lo miro luego]
```

#### 2. Problemas con datos del gestor

**Contexto:** Gestor envió declaración IVA pero los números no coinciden con datos en Verifactu

**Mensaje de Isaak:**
```
Houston, tenemos un desajuste 🛸

Tu gestor declaró 3.500€ de IVA pero yo tengo 3.200€ en facturas.

No pasa nada, esto es normal. Puede ser:
• Facturas que registró él y tú no
• Gastos no deducibles que él ajustó
• Importes redondeados

Te preparo una lista de preguntas para enviarle:

📋 "¿Qué facturas incluiste que no veo en mi sistema?"
📋 "¿Hay gastos que no sean deducibles?"
📋 "¿Podemos revisar juntos el resumen?"

[Copiar preguntas 📧] [Ver diferencias detalladas 🔍]
```

#### 3. Notificación de Agencia Tributaria

**Contexto:** Usuario recibe notificación de AEAT en buzón electrónico

**Mensaje de Isaak:**
```
Ok, respira hondo 🧘‍♂️

Tienes una notificación de Hacienda. Sí, asustan siempre.

Pero tranquilo: 8 de cada 10 son avisos normales 
(recordatorios, confirmaciones, etc.)

Vamos a leerla juntos CON CALMA.

Título: "Comunicación modelo 303 - 4T 2025"

Esto solo dice que recibieron tu declaración de IVA ✅
No es una multa ni un problema. Es un "acuse de recibo".

¿Quieres que te explique qué significa cada parte?

[Sí, explícamelo 🤓] [Entendido, gracias 👍]
```

#### 4. Usuario lleva días sin registrar nada

**Contexto:** Han pasado 7 días sin actividad

**Mensaje de Isaak:**
```
¿Todo bien por ahí? 😊

Hace una semana que no nos vemos.

No pasa nada si andas liado, pero recuerda que cuanto 
más fresco lo lleves, menos se acumula para fin de mes.

Si quieres, puedo recordarte cada viernes que revises 
los gastos de la semana (tardo 5 minutos).

¿Activamos recordatorio semanal?

[Sí, cada viernes 📅] [No, gracias]
```

---

## ⚙️ Configuración de Tono Personalizable

### Ubicación en la Interfaz

**Ruta:** Configuración > Mi cuenta > Isaak > Tono de conversación

### Opciones Disponibles

```
┌─────────────────────────────────────────────┐
│ 🎨 Personaliza cómo habla Isaak            │
├─────────────────────────────────────────────┤
│                                             │
│ ○ Cercano 🤗                               │
│   Emoticonos, frases amigables, bromas     │
│   Ejemplo: "¡Genial! Ya tienes 3 facturas  │
│   registradas 🎉"                           │
│                                             │
│ ● Profesional 💼 (seleccionado)            │
│   Claro y directo, menos emoticonos        │
│   Ejemplo: "Perfecto. 3 facturas           │
│   registradas correctamente ✓"             │
│                                             │
│ ○ Mínimo 📝                                │
│   Sin emoticonos, máxima brevedad          │
│   Ejemplo: "3 facturas registradas"        │
│                                             │
│ [Guardar cambios]                           │
└─────────────────────────────────────────────┘
```

### Implementación Técnica

**Base de datos:**
```sql
-- Añadir columna a user_preferences
ALTER TABLE user_preferences 
ADD COLUMN isaak_tone VARCHAR(20) DEFAULT 'friendly';

-- Valores permitidos: 'friendly' | 'professional' | 'minimal'
```

**Hook React:**
```typescript
// hooks/useIsaakTone.ts
export function useIsaakTone() {
  const [tone, setTone] = useState<'friendly' | 'professional' | 'minimal'>('friendly');
  
  useEffect(() => {
    // Cargar desde user_preferences
    fetchUserPreferences()
      .then(prefs => setTone(prefs.isaak_tone));
  }, []);
  
  const updateTone = async (newTone: string) => {
    await updateUserPreferences({ isaak_tone: newTone });
    setTone(newTone as any);
  };
  
  return { tone, updateTone };
}
```

**Aplicación en mensajes:**
```typescript
function formatIsaakMessage(content: string, tone: ToneType): string {
  switch (tone) {
    case 'friendly':
      return content; // Incluye emoticonos y exclamaciones
      
    case 'professional':
      // Reducir emoticonos (max 1 por mensaje)
      return content
        .replace(/[😊🎉👏🙌]+/g, (match) => match[0]) // Solo 1
        .replace(/¡/g, '') // Sin exclamaciones abiertas
        .replace(/!{2,}/g, '!'); // Max 1 exclamación
      
    case 'minimal':
      // Eliminar todos los emoticonos y ser ultra-breve
      return content
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Todos emoticonos
        .replace(/[¡!]+/g, '.') // Exclamaciones → punto
        .split('. ')[0] + '.'; // Solo primera frase
  }
}
```

---

## 💬 Historial de Conversaciones

### Menú Principal - Nueva Opción "Isaak"

**Ubicación:** Sidebar > Isaak 💬

**Vista:**
```
┌────────────────────────────────────────────────┐
│ 💬 Conversaciones con Isaak                   │
│                                                │
│ Buscar... 🔍                    [+ Nueva]      │
├────────────────────────────────────────────────┤
│                                                │
│ 📅 Hoy                                         │
│                                                │
│ • ¿Cómo registro una factura?                 │
│   Hace 2 horas • 8 mensajes                   │
│   [Ver] [Compartir] [Eliminar]                │
│                                                │
│ • Diferencias con mi gestor                    │
│   Hace 5 horas • 12 mensajes                  │
│   [Ver] [Compartir] [Eliminar]                │
│                                                │
├────────────────────────────────────────────────┤
│ 📅 Ayer (14 ene)                               │
│                                                │
│ • Dudas sobre IVA trimestral                   │
│   14 ene, 14:30 • 6 mensajes                  │
│   [Ver] [Compartir] [Eliminar]                │
│                                                │
├────────────────────────────────────────────────┤
│ 📅 Esta semana                                 │
│                                                │
│ • Revisar gastos diciembre                     │
│   12 ene, 10:15 • 15 mensajes                 │
│   [Ver] [Compartir] [Eliminar]                │
│                                                │
│ • ¿Qué es el modelo 130?                       │
│   10 ene, 16:20 • 4 mensajes                  │
│   [Ver] [Compartir] [Eliminar]                │
│                                                │
└────────────────────────────────────────────────┘
```

### Estructura de Base de Datos

```sql
CREATE TABLE isaak_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  title TEXT, -- Auto-generado del primer mensaje
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE isaak_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES isaak_conversations(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ, -- Si usuario editó
  metadata JSONB -- Contexto adicional
);

CREATE INDEX idx_conversations_user ON isaak_conversations(user_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON isaak_messages(conversation_id, created_at);
```

### Acciones sobre Conversaciones

#### 1. Ver Conversación Completa

**Click en "Ver"** → Abre modal con historial:

```
┌────────────────────────────────────────────────┐
│ 💬 ¿Cómo registro una factura?          [✕]   │
├────────────────────────────────────────────────┤
│                                                │
│ TÚ • Hace 2 horas                              │
│ ¿Cómo registro una factura de un cliente?     │
│                                                │
│ ISAAK • Hace 2 horas                           │
│ ¡Fácil! 😊 Ve a Facturas > Nueva factura      │
│                                                │
│ Solo necesitas:                                │
│ • Cliente (si no existe, lo creas ahí)         │
│ • Concepto                                     │
│ • Importe                                      │
│                                                │
│ El resto (IVA, número, fecha) se rellena       │
│ automáticamente.                               │
│                                                │
│ ¿Quieres que te guíe paso a paso?             │
│                                                │
│ TÚ • Hace 2 horas                              │
│ Sí por favor                                   │
│                                                │
│ ... (resto de mensajes)                        │
│                                                │
├────────────────────────────────────────────────┤
│ [⬆️ Volver arriba] [💾 Descargar PDF]         │
└────────────────────────────────────────────────┘
```

#### 2. Compartir Conversación

**Click en "Compartir"** → Genera enlace público temporal:

```
┌────────────────────────────────────────────────┐
│ 🔗 Compartir conversación                      │
├────────────────────────────────────────────────┤
│                                                │
│ Enlace válido por 24 horas:                    │
│                                                │
│ https://verifactu.business/shared/conv/xyz123  │
│ [Copiar enlace 📋]                             │
│                                                │
│ ⚠️ Cualquier persona con este enlace podrá     │
│    leer la conversación completa.              │
│                                                │
│ Útil para:                                     │
│ • Enviar a tu gestor o asesor                  │
│ • Compartir con socio o empleado               │
│ • Incluir en email de consulta                 │
│                                                │
│ [Generar enlace] [Cancelar]                    │
└────────────────────────────────────────────────┘
```

**Implementación:**
```typescript
async function shareConversation(conversationId: string) {
  const shareId = randomUUID();
  
  await query(`
    INSERT INTO shared_conversations (
      id, conversation_id, expires_at
    ) VALUES ($1, $2, NOW() + INTERVAL '24 hours')
  `, [shareId, conversationId]);
  
  return `https://verifactu.business/shared/conv/${shareId}`;
}
```

#### 3. Eliminar Conversación

**Click en "Eliminar"** → Confirmación obligatoria:

```
┌────────────────────────────────────────────────┐
│ 🗑️ ¿Eliminar conversación?                    │
├────────────────────────────────────────────────┤
│                                                │
│ Se borrará permanentemente:                    │
│                                                │
│ "¿Cómo registro una factura?"                  │
│ 8 mensajes • Creada hace 2 horas               │
│                                                │
│ ⚠️ Esta acción NO se puede deshacer            │
│                                                │
│ [Sí, eliminar] [Cancelar]                      │
└────────────────────────────────────────────────┘
```

#### 4. Editar Mensaje (solo último enviado)

**Solo disponible para último mensaje del usuario**

**Hover sobre mensaje** → Aparece icono ✏️:

```
┌────────────────────────────────────────────────┐
│ TÚ • Hace 5 minutos                    [✏️]    │
│ ¿Cuál es el plazo para IVA mensual?           │
│                                                │
│ [Editar este mensaje]                          │
└────────────────────────────────────────────────┘
```

**Click en editar:**
```
┌────────────────────────────────────────────────┐
│ Editar mensaje                                 │
├────────────────────────────────────────────────┤
│                                                │
│ ┌────────────────────────────────────────┐    │
│ │ ¿Cuál es el plazo para IVA trimestral?│    │
│ │                                        │    │
│ └────────────────────────────────────────┘    │
│                                                │
│ ℹ️ Isaak generará una nueva respuesta          │
│                                                │
│ [Guardar cambios] [Cancelar]                   │
└────────────────────────────────────────────────┘
```

#### 5. Reenviar/Duplicar Mensaje

**Use case:** Hacer pregunta similar en nueva conversación

```
Hover sobre mensaje → [⤴️ Reenviar]

Click → Crea nueva conversación con ese mensaje
```

---

## 📂 Gestión Inteligente de Documentos (Storage)

### Sistema de Cloud Storage

**Plataforma:** Google Cloud Storage (integrado con Firebase)

**Bucket structure:**
```
verifactu-docs-production/
  {tenant_id}/
    legal/
    facturas-emitidas/
      {año}/
        {mes}/
    facturas-recibidas/
      {año}/
        {mes}/
    gastos/
      {año}/
        tickets/
    extractos/
      {año}/
    gestor/
      declaraciones/
      informes/
```

### Organización Automática por Isaak

**Flujo cuando usuario sube documento:**

```
1. Usuario hace drag & drop de "factura_luz_enero.pdf"
                    ↓
2. Isaak analiza con IA:
   - Nombre archivo: "luz" → Servicio
   - Contenido: "Endesa" + "Enero 2026" + "145,50€"
   - Tipo: Factura recibida
                    ↓
3. Isaak pregunta:
   "📄 He visto que subiste una factura de Endesa (145,50€)
   
   ¿Dónde la guardo?
   
   [📂 Gastos > Enero 2026] (recomendado)
   [📂 Facturas recibidas > Enero 2026]
   [📂 Déjame elegir otra]"
                    ↓
4. Usuario confirma opción 1
                    ↓
5. Isaak:
   - Guarda en: gastos/2026/enero/endesa-145.50.pdf
   - Renombra: "Endesa - Suministro eléctrico - 15 ene 2026.pdf"
   - Pregunta: "¿Registro este gasto automáticamente?"
                    ↓
6. Si acepta:
   - Crea gasto en DB vinculado al documento
   - Extrae: proveedor, concepto, importe, categoría, IVA
```

### Detección Inteligente de Tipo de Documento

**Isaak usa IA para clasificar:**

```typescript
interface DocumentAnalysis {
  type: 'invoice_issued' | 'invoice_received' | 'receipt' | 'bank_statement' 
        | 'legal_doc' | 'tax_declaration' | 'other';
  vendor?: string;
  client?: string;
  amount?: number;
  date?: string;
  concept?: string;
  confidence: number; // 0-1
}

async function analyzeDocument(file: File): Promise<DocumentAnalysis> {
  // 1. Leer con OCR (Vision API)
  const ocrText = await extractText(file);
  
  // 2. Detectar tipo por keywords
  if (ocrText.includes('FACTURA') && ocrText.includes('EMITIDA')) {
    return { type: 'invoice_issued', confidence: 0.9, ... };
  }
  
  // 3. Extraer datos clave con IA
  const extracted = await extractFields(ocrText);
  
  return {
    type: 'invoice_received',
    vendor: extracted.vendor,
    amount: extracted.total,
    date: extracted.date,
    confidence: 0.85
  };
}
```

### Acciones con Documentos

#### 1. Subir Documento

**Opción A: Drag & Drop global**
```
Usuario arrastra archivo desde escritorio → 
Aparece overlay: "📤 Suelta aquí para subir"
```

**Opción B: Botón en cada panel**
```
[Subir documento 📤]
→ Abre selector de archivos
→ Permite múltiples archivos
```

**Opción C: Desde conversación con Isaak**
```
Usuario: "Tengo una factura de Telefónica"
Isaak: "¡Perfecto! Súbela aquí 👇 y la reviso"
[Adjuntar archivo 📎]
```

#### 2. Descargar Documento

**Individual:**
```
Click en documento → [Descargar 💾]
```

**Múltiple:**
```
Checkbox en cada doc → [Descargar selección (3) 💾]
→ Genera ZIP con nombre: "Facturas-Enero-2026.zip"
```

**Carpeta completa:**
```
Click derecho en carpeta → [Descargar todo 💾]
→ Comprime toda la carpeta
```

#### 3. Compartir Documento

**Con gestor/asesor:**
```
Click en doc → [Compartir 🔗]

┌────────────────────────────────────────┐
│ Compartir: Endesa-enero.pdf            │
├────────────────────────────────────────┤
│ Enviar a:                              │
│ [📧 gestor@asesoria.es          ]     │
│                                        │
│ Mensaje (opcional):                    │
│ ┌────────────────────────────────┐    │
│ │ Hola, adjunto factura Endesa   │    │
│ │ para incluir en declaración    │    │
│ └────────────────────────────────┘    │
│                                        │
│ ⏰ Enlace válido: 7 días               │
│                                        │
│ [Enviar] [Cancelar]                    │
└────────────────────────────────────────┘
```

**Con empleado (dentro de Verifactu):**
```
Click en doc → [Compartir 🔗]
→ Asigna permisos de lectura al usuario
→ Aparece en su panel de documentos compartidos
```

**Público: NO PERMITIDO** (seguridad)

#### 4. Eliminar Documento

**Flujo de papelera (30 días):**
```
Click en doc → [Eliminar 🗑️]
                    ↓
Confirmación:
"¿Mover a papelera? (recuperable 30 días)"
[Sí] [No]
                    ↓
Documento en papelera (visible en panel)
                    ↓
Después de 30 días → Borrado permanente automático
```

**Borrado inmediato (admin/owner):**
```
En papelera → [Eliminar permanentemente]
Confirmación: "⚠️ ESTO NO SE PUEDE DESHACER"
```

### Integración con Facturas Verifactu

#### Al emitir factura (automático):

```
1. Usuario crea factura en panel Facturas
                    ↓
2. Sistema genera:
   - PDF visual (para enviar a cliente)
   - XML Verifactu (con firma electrónica)
                    ↓
3. Isaak guarda automáticamente:
   📂 facturas-emitidas/2026/enero/
      - F-2026-001.pdf
      - F-2026-001.xml
                    ↓
4. Notificación toast:
   "✅ Factura F-2026-001 guardada y firmada"
```

#### Al recibir factura (upload + IA):

```
1. Usuario sube "factura_aws_hosting.pdf"
                    ↓
2. Isaak lee con OCR:
   - Proveedor: Amazon Web Services EMEA SARL
   - CIF: ESB76365731
   - Concepto: Hosting + S3 Storage
   - Importe: 127,50€ (105,37€ base + 22,13€ IVA)
   - Fecha: 01/01/2026
                    ↓
3. Isaak pregunta:
   "📄 Factura de AWS por 127,50€
   
   ¿Quieres que registre este gasto?
   
   Categoría sugerida: Servicios > Cloud
   
   [Sí, regístralo ✅] [No, solo guardar 📁] [Editar datos ✏️]"
                    ↓
4. Si acepta:
   - Crea gasto en DB
   - Vincula PDF al gasto (campo document_url)
   - Guarda en: gastos/2026/enero/aws-127.50.pdf
                    ↓
5. Confirmación:
   "✅ Gasto registrado y documento guardado"
```

---

## 🔄 Estados de Isaak según Contexto

### En Dashboard Principal

**Saludo contextual:**
```
Buenos días [Nombre] 👋

Hoy llevas:
• 2 facturas emitidas (3.450€)
• 1 gasto registrado (89€)

Beneficio del día: 3.361€ 💰

¿Todo bien o necesitas revisar algo?
```

### En Panel de Facturas

**Si no hay facturas:**
```
Todavía no has creado ninguna factura 📄

¿Quieres que te enseñe cómo hacerlo en 30 segundos?

[Sí, enséñame 🚀] [Luego lo miro]
```

**Si hay facturas pendientes:**
```
⏰ Tienes 3 facturas pendientes de cobro (total: 8.900€)

¿Quieres que te ayude a enviar recordatorios a los clientes?
```

### En Panel de Gastos

**Detecta tickets sin clasificar:**
```
📸 Veo que subiste 2 tickets de restaurante

¿Los clasifico en "Gastos de representación"?

[Sí ✅] [No, otra categoría]
```

### En Configuración

**Revisa datos faltantes:**
```
⚠️ Falta configurar el certificado digital

Sin él no podrás emitir facturas Verifactu oficiales.

¿Quieres que te explique cómo conseguirlo?
```

---

## 📊 Métricas de Uso de Isaak

**Trackear para mejorar:**

```sql
CREATE TABLE isaak_analytics (
  id UUID PRIMARY KEY,
  user_id TEXT,
  event_type VARCHAR(50), -- 'message_sent', 'suggestion_accepted', 'tone_changed'
  event_data JSONB,
  created_at TIMESTAMPTZ
);

-- Ejemplos de eventos:
INSERT INTO isaak_analytics VALUES
  ('...', 'user123', 'message_sent', '{"length": 45, "contains_emoji": true}', NOW()),
  ('...', 'user123', 'suggestion_accepted', '{"suggestion_type": "register_expense"}', NOW()),
  ('...', 'user123', 'tone_changed', '{"from": "friendly", "to": "professional"}', NOW());
```

**KPIs a medir:**
- Conversaciones por usuario/mes
- Tasa de aceptación de sugerencias
- Documentos organizados por Isaak
- % usuarios que personalizan tono
- Tiempo promedio de respuesta

---

## 🚀 Roadmap de Implementación

### Fase 1: Tono y Personalización (Semana 1)
- [ ] Crear tabla `user_preferences.isaak_tone`
- [ ] Hook `useIsaakTone()`
- [ ] Componente configuración tono
- [ ] Aplicar formato según tono en todas las respuestas
- [ ] Tests A/B entre tonos

### Fase 2: Historial (Semana 2)
- [ ] Tablas `isaak_conversations` + `isaak_messages`
- [ ] Panel "Isaak" en menú
- [ ] Vista de historial con agrupación por fecha
- [ ] Acciones: ver, compartir, eliminar, editar
- [ ] Endpoints API completos

### Fase 3: Storage (Semana 3-4)
- [ ] Configurar Google Cloud Storage bucket
- [ ] Implementar subida con drag & drop global
- [ ] Sistema de clasificación con IA (Vision API)
- [ ] Organización automática en carpetas
- [ ] Vinculación documentos ↔ gastos/facturas
- [ ] Panel de gestión de documentos

### Fase 4: Integración Verifactu (Semana 5)
- [ ] Auto-guardado facturas emitidas (PDF + XML)
- [ ] OCR facturas recibidas con extracción datos
- [ ] Sugerencias automáticas de registro
- [ ] Reconciliación documentos vs DB

### Fase 5: Optimizaciones (Semana 6)
- [ ] Métricas de uso (analytics)
- [ ] Mejoras de UX según datos
- [ ] Tests de carga (storage)
- [ ] Documentación usuario final

---

**Nota final:**  
Esta especificación complementa ISAAK_UNIFIED_SPEC.md y DEMO_TRIAL_UNIFIED.md.  
Prioridad: Implementar en orden (Fase 1 → Fase 5) para validar cada pieza antes de continuar.

---

**Creado por:** Isaak (con K)  
**Para:** Verifactu.business  
**Siguiente paso:** Revisar con Ksenia y aprobar roadmap
