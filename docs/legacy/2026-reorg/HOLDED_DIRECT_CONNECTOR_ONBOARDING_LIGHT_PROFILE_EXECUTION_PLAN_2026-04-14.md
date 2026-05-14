# Holded Direct Connector - Onboarding Light Profile Execution Plan (2026-04-14)

## Objetivo

Reducir friccion en el onboarding publico del conector directo `ChatGPT <-> Holded` sin perder control operativo sobre empresas conectadas.

Principio:

- conectar rapido primero
- completar perfil fiscal despues

Este plan prioriza cambios de frontend y copy en la fase inicial, manteniendo el backend actual intacto salvo tareas opcionales de fases posteriores.

## Resultado esperado

1. Mejor conversion en alta del conector.
2. Menos abandono en el paso empresa.
3. Trazabilidad clara de empresas conectadas aunque Holded no devuelva todos los datos fiscales.
4. Ruta simple para completar perfil legal tras la conexion.

---

## Fase 0 - Alineacion funcional y copy (sin backend)

Duracion sugerida: 0.5-1 dia

### Tareas

1. Definir contrato visible de onboarding en 4 pasos:
   - Identidad
   - Completa tu perfil
   - Completa tu perfil de empresa
   - API key
2. Aprobar diccionario de copy publico (titulos, subtitulos, errores, botones).
3. Acordar campos minimos obligatorios para activar conexion.

### Campos minimos propuestos para activar conexion

- persona: nombre, apellidos, rol
- empresa: nombre empresa, correo de avisos
- conexion: API key

### Campos movidos a perfil posterior

- CIF/NIF
- domicilio fiscal
- sector

### Criterio de salida

- copy aprobado
- lista de campos obligatorios y postergados cerrada
- decision explicita de no bloquear conexion por perfil fiscal incompleto

---

## Fase 1 - Quick wins de UX y copy (frontend-only)

Duracion sugerida: 1 dia

### Tareas

1. Cambiar naming de pasos:
   - "Paso 1: confirma tu identidad"
   - "Paso 2: completa tu perfil"
   - "Paso 3: completa tu perfil de empresa"
   - "Paso 4: conecta Holded"
2. Sustituir mensajes ambiguos por estado neutral:
   - evitar mensajes que atribuyan Google si no corresponde
3. Mostrar mensajes accionables por paso:
   - en API: "Solo falta validar tu clave API para terminar"
4. Limitar avisos de identidad al contexto donde son utiles.
5. Revisar textos de error para que indiquen accion siguiente.

### Criterio de salida

- onboarding mas claro sin cambios de backend
- tests de onboarding en verde
- sin regresiones de navegacion entre pasos

---

## Fase 2 - Simplificacion del paso empresa (frontend-only)

Duracion sugerida: 1-1.5 dias

### Tareas

1. Convertir CIF/NIF, domicilio y sector en "completar despues".
2. Mantener visibles esos campos como opcionales en esta fase:
   - etiqueta "Opcional ahora"
   - texto "Lo puedes completar despues"
3. Mantener validacion estricta solo para:
   - nombre empresa
   - correo de avisos
4. Ajustar boton principal:
   - "Continuar con API key"
5. Incluir microcopy de confianza:
   - "Tu conexion se activa ahora; los datos fiscales se completan despues"

### Criterio de salida

- empresa no bloquea por datos fiscales en onboarding inicial
- API step recibe contexto suficiente para cerrar conexion
- conversion de paso empresa sube respecto a baseline

---

## Fase 3 - Control operativo de empresas conectadas (sin bloquear conversion)

Duracion sugerida: 1-2 dias

### Objetivo

Tener visibilidad y control aunque Holded no aporte todos los datos fiscales por API.

### Tareas

1. Definir estado de completitud de perfil (en UI y docs):
   - Conectada (basica)
   - Perfil fiscal pendiente
   - Perfil completo
2. Exponer badge de estado en vistas de integracion.
3. Crear checklist de "perfil pendiente" post-conexion.
4. Priorizar CTA de completado en el success screen y en integraciones:
   - "Completar perfil fiscal"

### Nota de implementacion

Esta fase puede iniciarse solo con frontend usando datos ya disponibles y reglas de UI.

### Criterio de salida

- cada empresa conectada tiene estado visible de completitud
- soporte puede distinguir rapido conexion activa vs perfil fiscal incompleto

---

## Fase 4 - Flujo post-conexion: completar perfil fiscal

Duracion sugerida: 1.5-2 dias

### Tareas

1. Crear ruta/pantalla dedicada de completado:
   - "Completa tu perfil fiscal"
2. Pedir y guardar:
   - CIF/NIF
   - domicilio fiscal
   - sector
3. Añadir confirmacion final:
   - "Perfil fiscal completado"
4. Reforzar entrada desde:
   - success screen
   - integraciones
   - recordatorio in-app

### Criterio de salida

- usuario puede conectar primero y completar despues sin perder continuidad
- datos fiscales quedan consolidados cuando realmente se necesitan

---

## Fase 5 - Reglas de uso por nivel de perfil

Duracion sugerida: 1 dia

### Tareas

1. Definir acciones permitidas con perfil basico.
2. Definir acciones que requieren perfil fiscal completo.
3. Mostrar mensaje de desbloqueo cuando falte perfil fiscal.
4. Documentar la politica para soporte y producto.

### Criterio de salida

- comportamiento consistente: no se bloquea la conexion inicial, pero se protege lo sensible

---

## Matriz de tareas implementables (resumen)

### Bloque A - Inmediato (2-3 dias, sin backend)

1. Quick wins de copy por paso.
2. Paso empresa con validacion minima.
3. Mensajeria de "completar despues".
4. Badge de estado de perfil en UI.

### Bloque B - Corto plazo (3-5 dias)

1. Pantalla de completar perfil fiscal.
2. CTA desde success e integraciones.
3. Reglas de uso por completitud.

### Bloque C - Mejora continua

1. Medir conversion por paso.
2. Medir abandono en empresa/API.
3. Ajustar copy por evidencias reales.

---

## KPI sugeridos

1. Conversion identidad -> API conectada.
2. Abandono en paso empresa.
3. Tiempo medio de conexion completa.
4. % de empresas con perfil fiscal pendiente a 24h.
5. % de empresas que completan perfil fiscal en 7 dias.

---

## Riesgos y mitigacion

1. Riesgo: demasiada flexibilidad reduce calidad de datos.
   - Mitigacion: estado de completitud + CTA de completado + gate por accion.
2. Riesgo: soporte no distingue casos.
   - Mitigacion: badge visible por empresa y checklist operativo.
3. Riesgo: confusion del usuario sobre cuando acaba onboarding.
   - Mitigacion: success screen claro "conexion lista" + "perfil fiscal recomendado".

---

## Definicion de Done por fase

1. Copy aprobado y consistente con contrato publico.
2. Tests de onboarding en verde.
3. Sin reintroducir popup/login clasico.
4. Flujo OAuth -> onboarding -> callback intacto.
5. QA manual en desktop y mobile.

---

## Orden de implementacion recomendado

1. Fase 1
2. Fase 2
3. Fase 3
4. Fase 4
5. Fase 5

Este orden maximiza conversion inmediata y deja el control fiscal como capa progresiva sin romper la experiencia del conector.
