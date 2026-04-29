# Plan de implementación: Onboarding completo tras conexión en ChatGPT y Claude

## Fase 1: Análisis y diseño

1. Identificar puntos de conexión inicial en ChatGPT y Claude (backend y frontend).
2. Revisar lógica actual de onboarding y persistencia de drafts.
3. Diseñar el flujo de comprobación/redirección a onboarding tras conectar.

## Fase 2: Implementación técnica

### Backend

1. Crear/centralizar función utilitaria para comprobar si el perfil está completo.
2. Modificar endpoints de conexión (Claude y ChatGPT) para:
   - Comprobar si el usuario tiene perfil completo tras conectar.
   - Si no, devolver/iniciar estado de onboarding pendiente.
3. Asegurar persistencia de drafts tras cada paso del onboarding.
4. Modificar triggers de emails/avisos para que solo se disparen tras onboarding completo.

### Frontend

1. En ChatGPT y Claude, tras conectar, mostrar UI/prompt para completar perfil si falta información.
2. Implementar navegación paso a paso (wizard o prompts secuenciales).
3. Permitir reanudar onboarding si el usuario lo deja a medias.

## Fase 3: QA y validación

1. Testear el flujo completo en ambos canales (conexión, onboarding, emails).
2. Validar que no se envían emails ni avisos hasta completar el perfil.
3. Asegurar que el usuario no puede usar el conector sin completar onboarding.

## Fase 4: Documentación y despliegue

1. Actualizar documentación técnica y de producto.
2. Comunicar cambios a soporte y equipo de producto.
3. Desplegar en entorno de staging y luego producción.

---

**Siguiente paso:** Empezar por la Fase 2, identificando los archivos clave y añadiendo la función de comprobación de perfil completo.
