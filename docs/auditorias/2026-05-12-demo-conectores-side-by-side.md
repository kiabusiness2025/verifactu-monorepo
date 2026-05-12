# Auditoría conectores Holded — Demo side-by-side Claude vs ChatGPT

**Fecha:** 12 de mayo de 2026
**Ejecutor:** Ksenia (soporte@verifactu.business) + Claude (Opus 4.7) vía Cowork mode
**Entorno:** Holded demo tenant Verifactu
**Conectores probados:**

- Claude: `https://claude.verifactu.business/mcp` con preset `holded_full_read_v1`
- ChatGPT: proyecto HOLDED dentro de workspace "CASA DE GAIA VS EXPERT", chip "Holded App" enganchado

---

## 1. Material de partida

| #   | Video                                              | URL                                                         | Duración   | Plataforma |
| --- | -------------------------------------------------- | ----------------------------------------------------------- | ---------- | ---------- |
| 1   | Últimas facturas emitidas - 12 May 2026            | https://www.loom.com/share/9456d8363bdc42d48097352be2062cc6 | 4 min 9 s  | Claude     |
| 2   | Holded \| Hub vertical de conectores - 12 May 2026 | https://www.loom.com/share/ab13eb6496604f50a84f4f4073fbc4fc | 3 min 30 s | ChatGPT    |

**Chats canónicos** (texto íntegro de las respuestas):

- Claude: https://claude.ai/chat/29fea90f-1489-46d3-b9d1-8ba437b4ad95
- ChatGPT: https://chatgpt.com/c/6a02feac-4ae8-8332-ae6b-5fbf129fb833

**Nota metodológica:** la intención original era grabar un side-by-side simultáneo, pero Loom bloqueó la pestaña ChatGPT desde el Chrome MCP (error `Cannot access a chrome-extension:// URL of different extension`). Se reorganizó en dos tomas separadas. Para el montaje final del Video 3 (comparativa) se hará el side-by-side en edición, no en vivo.

---

## 2. Prompts ejecutados

Los tres prompts compartidos entre ambos conectores fueron:

```
1. Lista mis 5 últimas facturas emitidas con número, fecha, cliente e importe total.
2. Dame el balance de sumas y saldos a fecha de hoy de las cuentas del grupo 7 (ventas).
3. Muéstrame los 5 contactos más recientes con nombre, email y NIF.
```

En Claude los prompts 2 y 3 se combinaron por accidente en un mismo turno; el modelo los resolvió ambos en paralelo. En ChatGPT se ejecutaron como turnos separados.

Se preparó una segunda batería de prompts 4-11 para auditar las tools restantes (productos, empleados, proyectos, presupuestos, CRM funnels, asientos contables, plan contable, libro diario). **No se ejecutaron por límite de tiempo de la demo.** Pendiente investigar en task #105 si OpenAI tiene cap de tool calls por sesión.

---

## 3. Auditoría por prompt

### Prompt 1 — Lista facturas emitidas

| Aspecto                   | Claude (Opus 4.7)                                                | ChatGPT (modo desarrollador)                |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| Tool invocado             | `list_documents` + `get_document` (2 tools)                      | "Herramienta llamada" (no expone nombre)    |
| Resultado                 | Tabla F0026-F0030, **fechas 08-12/03/2026**                      | Tabla F0026-F0030, **fechas 07-11/03/2026** |
| Total facturado calculado | 1.200,32 € (correcto)                                            | No calcula total                            |
| Valor añadido             | Detectó que F0028 está pendiente de cobro y ofreció recordatorio | —                                           |
| Transparencia tool calls  | "Used 2 tools, loaded tools" explícito                           | Texto genérico "Herramienta llamada"        |

**Bug detectado: desfase de 1 día en fechas.** Las dos plataformas leen el mismo dato pero lo presentan con 1 día de diferencia. Probable timezone handling en `list_documents` (UTC vs Europe/Madrid). → **Task #104**.

### Prompt 2 — Balance grupo 7 (ventas)

| Aspecto                | Claude                                                                                                              | ChatGPT                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Estrategia             | Reconstruir desde libro diario filtrando cuentas que empiezan por 7                                                 | Buscar herramientas, llamar a tool genérico               |
| Tool calls             | 11 intentos (8 fallidos por bug endtmp, 3 con timestamps Unix exitosos)                                             | 2-3 llamadas, primera al plan contable, segunda al diario |
| Resultado final        | **10.705 €** acreedor en cuenta 70500000 (26 asientos)                                                              | **6.221 €** acreedor en cuenta 70500000                   |
| Detección de problemas | ⚠️ Detectó que el diario solo llega a 11/05/2025 mientras las facturas son de 2026; avisó al usuario explícitamente | ❌ No mencionó nada de esto                               |
| Uso de Python          | ✅ Llamó a Python con código explícito para calcular el balance                                                     | ❌ No tiene Python visible en el flow                     |

**Bug GRAVE en Claude:** `get_journal` rechaza `endtmp: null` que se reinyecta solo. Claude intentó **8 veces** antes de resolver con Unix timestamps numéricos. Texto literal del chat:

> "El sistema sigue inyectando endtmp: null aunque intento omitirlo… Voy a probar con timestamps Unix numéricos."

Si el modelo del lado del usuario fuera menos capaz, simplemente fallaría. → **Task #101 (P0)**.

**Limitación GRAVE en ChatGPT:** la cifra de 6.221 € es **incorrecta**. La cifra real (la que dio Claude tras paginar el diario completo) es 10.705 €. ChatGPT no paginó hasta el final del libro diario y dio una respuesta parcial sin avisar. Para una tool contable esto es un fallo crítico — un usuario podría tomar decisiones con datos a la mitad. → **Task #103 (P1)**.

### Prompt 3 — Contactos más recientes

| Aspecto             | Claude                                                                     | ChatGPT                                                                                                  |
| ------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Contactos devueltos | Beta Eventos, Gamma Studio, Delta Reformas, Épsilon Legal, Zeta Salud      | Nova Gestión, Imprenta Profesional Med…, Inmuebles Patrimoniales…, Despacho Fiscal…, Servicios Limpieza… |
| Coincidencia        | **0 contactos en común**                                                   |                                                                                                          |
| Campo vatnumber     | ⚠️ Detectó que el campo vatnumber está vacío en estos contactos y advirtió | ❌ Mostró el código interno del contacto como si fuera NIF                                               |
| Criterio de orden   | No determinista en ambos                                                   | No determinista en ambos                                                                                 |

**Bug COMÚN a los dos:** `list_contacts` no garantiza orden cronológico. Uno paginó hacia el principio (Claude → contactos antiguos), otro hacia el final (ChatGPT → contactos más nuevos), o el endpoint Holded simplemente no expone parámetro de orden. → **Task #102 (P1)**.

---

## 4. Resumen de hallazgos

### Bugs del MCP server (afectan a ambos)

1. **`list_contacts` orden no determinista** — falta parámetro `sort=createdAt:desc` por defecto.
2. **Desfase de 1 día en fechas** — timezone handling.
3. **No hay flag `truncated: true`** — el modelo no sabe que la respuesta está cortada.

### Bug específico de Claude wrapper

4. **`get_journal endtmp=null` reinyectado** — Claude pierde 8 intentos hasta descubrir el workaround.

### Limitaciones del lado del cliente (no del MCP server)

5. **ChatGPT no pagina hasta el final** en respuestas largas — combinado con #3 da respuestas incorrectas.
6. **ChatGPT solo ejecutó 3 prompts de 11** — investigar si hay cap de tool calls por sesión.
7. **ChatGPT no expone nombre del tool en UI** — peor trazabilidad para usuario y para review Anthropic/OpenAI.

### Ventajas cualitativas observadas en Claude

- Python interpreter integrado para cálculos.
- Tool calls explícitos con nombre del tool.
- Auto-detección de problemas en los datos (fechas desfasadas, campo vacío).
- Valor añadido proactivo (ofrecer recordatorio de cobro a un cliente moroso).

### Ventajas cualitativas observadas en ChatGPT

- Respuestas más cortas y directas en prompts simples.
- Menos llamadas a tools por prompt (más eficiente cuando funciona).
- Formato tabla limpio y consistente.

---

## 5. Tasks creadas en el backlog

| Task     | Prio | Asunto                                              |
| -------- | ---- | --------------------------------------------------- |
| **#101** | P0   | Bug `get_journal endtmp=null` reinyectado           |
| **#102** | P1   | Bug `list_contacts` orden no determinista           |
| **#103** | P1   | Flag `truncated`/`next_cursor` en respuestas largas |
| **#104** | P2   | Bug desfase 1 día en fechas de facturas             |
| **#105** | P3   | Investigar por qué ChatGPT solo ejecutó 3 prompts   |

**Otros tasks tocados:**

- #91 [Demo Loom side-by-side] → completed
- #71 [A4 testing account + 3 prompts] → completed (demo cubre los 3 prompts)
- #72 [A5 screenshots + branding] → completed (los videos y screenshots de los chats sirven)

---

## 6. Plan para los 3 videos YouTube

| Video                           | Procedencia                                        | Edición                                                                                                  | Duración objetivo |
| ------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------- |
| **1. Holded × Claude**          | Video Loom `9456d836...` (Claude solo)             | Intro Verifactu 5 s + voiceover ES + CTA `claude.verifactu.business`                                     | 4-5 min           |
| **2. Holded × ChatGPT**         | Video Loom `ab13eb64...` (ChatGPT solo)            | Intro Verifactu 5 s + voiceover ES + CTA `chatgpt.verifactu.business`                                    | 3-4 min           |
| **3. Comparativa side-by-side** | Compuesto en edición de los dos anteriores a 50/50 | Subtítulos sobreimpresos comparando: tiempo de respuesta, formato, n.º tool calls, precisión del balance | 3-4 min           |

**Pendiente del usuario:** descargar los .mp4 de Loom a `C:\Users\KseniaILICHEVA\OneDrive - EXPERT ESTUDIOS PROFESIONALES, SL\Documentos\Claude\Projects\Holded-MCP\videos\` con nombres `holded-claude.mp4` y `holded-chatgpt.mp4`.

**Edición con:** `adobe-for-creativity:adobe-edit-quick-cut` para cortes rápidos, o ffmpeg directamente para el compuesto del Video 3.

**Importante para el guion del Video 3:** será honesto sobre el hallazgo de que ChatGPT dio una respuesta de balance incorrecta por no paginar — esto **vende** la opción Claude para contabilidad seria sin denigrar a ChatGPT (se posiciona como "uso casual" vs "uso contable serio").

---

## 7. Sources

- [Loom Video 1 — Claude](https://www.loom.com/share/9456d8363bdc42d48097352be2062cc6)
- [Loom Video 2 — ChatGPT](https://www.loom.com/share/ab13eb6496604f50a84f4f4073fbc4fc)
- [Chat Claude completo](https://claude.ai/chat/29fea90f-1489-46d3-b9d1-8ba437b4ad95)
- [Chat ChatGPT completo](https://chatgpt.com/c/6a02feac-4ae8-8332-ae6b-5fbf129fb833)
- Backlog tasks: #91 (completed), #71 (completed), #72 (completed), #101-#105 (nuevos)
