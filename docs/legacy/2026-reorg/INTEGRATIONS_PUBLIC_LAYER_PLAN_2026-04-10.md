# Plan de Capa Publica de Integraciones

Fecha: 2026-04-10

## Objetivo

Consolidar el relato publico de integraciones dentro de `verifactu.business` y dejar `holded.verifactu.business` como experiencia de activacion especializada.

Principio rector:

- `verifactu.business` vende y explica
- `holded.verifactu.business` activa y conecta
- el onboarding de Holded no debe cargar el peso comercial de marca

## Diagnostico actual

Hoy el usuario puede encontrarse con varias capas cercanas que cuentan casi la misma historia:

- `apps/landing/app/producto/integraciones/page.tsx`
- `apps/landing/app/producto/integraciones/isaak-for-holded/page.tsx`
- `apps/landing/app/holded/page.tsx`
- `apps/holded/app/page.tsx`

Problemas que genera esta situacion:

- duplicidad de mensaje publico
- dispersion de SEO y autoridad editorial
- riesgo de prometer mas en una pagina que en otra
- mezcla entre marketing, discovery y activacion

Decision recomendada:

- dejar una sola capa comercial canonica en `verifactu.business`
- usar `Holded + ChatGPT` como primera integracion visible
- convertir `holded.verifactu.business` en un funnel de activacion con chrome reducido

## Arquitectura recomendada

### Navegacion principal de marca

Menu desktop y mobile recomendado para `verifactu.business`:

- Inicio
- Que es Isaak
- Plataforma
- Integraciones
- Precios
- VeriFactu
- Recursos
- Contacto

Notas:

- `Integraciones` debe quedarse en primer nivel de navegacion, no enterrado en recursos ni producto tecnico.
- No recomiendo desplegable complejo en la primera iteracion. Basta una pagina indice clara con cards.
- `Holded + ChatGPT` debe ser la primera y unica integracion visible como disponible hoy.

### URLs canonicas

- `verifactu.business/producto/integraciones` -> pagina indice de integraciones
- `verifactu.business/producto/integraciones/isaak-for-holded` -> ficha comercial canonica
- `verifactu.business/holded` -> redirigir o dejar como alias no indexable hacia la ficha canonica
- `holded.verifactu.business` -> activacion especializada

### Reparto de roles

`/producto/integraciones`

- objetivo: discovery y arquitectura de oferta
- tono: marca, claridad, confianza
- CTA principal: ver la integracion Holded + ChatGPT

`/producto/integraciones/isaak-for-holded`

- objetivo: explicar bien el caso real y su alcance
- tono: comercial pero preciso
- CTA principal: abrir activacion especializada

`holded.verifactu.business`

- objetivo: activar acceso, validar API key y conectar
- tono: calmado, guiado, sin ruido comercial
- CTA principal: continuar al flujo

## Propuesta de la nueva seccion Integraciones

### Objetivo editorial

Presentar a Verifactu Business como una plataforma con integraciones reales y crecientes, empezando por un primer caso ya operativo: `Holded + ChatGPT`.

### Hero recomendado

Eyebrow:

- `Integraciones de Verifactu Business`

Titular:

- `Integraciones que convierten datos reales en decisiones claras`

Subtitulo:

- `Conectamos herramientas de trabajo reales con Isaak para que puedas entender mejor tu negocio, reducir friccion y actuar con mas contexto.`

CTA principal:

- `Ver Holded + ChatGPT`

CTA secundaria:

- `Hablar con el equipo`

Microcopy de apoyo:

- `Primera integracion operativa disponible hoy. Las siguientes se iran abriendo con el mismo criterio: utilidad real, claridad y control.`

### Bloque 1: Integraciones activas

Titulo:

- `Disponible hoy`

Subtitulo:

- `Una integracion visible, util y ya operativa. Preferimos abrir pocas y bien explicadas antes que prometer un catalogo inflado.`

Card principal recomendada:

- nombre: `Holded + ChatGPT`
- badge: `Disponible hoy`
- subtitulo: `Primera integracion operativa de Verifactu Business`
- descripcion: `Consulta facturas, contactos y contabilidad de Holded en lenguaje claro y prepara borradores de factura con confirmacion.`
- CTA: `Ver integracion`

Composicion visual de la card:

- icono Holded a la izquierda
- icono ChatGPT a la derecha
- separador visual minimo
- fondo blanco, borde suave, badge azul de marca y acento coral o rojo solo para la integracion Holded

Asset recomendado para ChatGPT:

- `brand/ChatGPT-Logo.svg.png`

### Bloque 2: Como entendemos una integracion

Titulo:

- `No anadimos logos. Anadimos contexto util para Isaak.`

3 pilares:

- `Dato real`: `La integracion aporta informacion operativa de origen, no una demo superficial.`
- `Explicacion clara`: `Isaak traduce datos a lenguaje util para decidir.`
- `Control`: `Preferimos un alcance acotado, seguro y explicable antes que una promesa enorme.`

### Bloque 3: Proximas integraciones

Titulo:

- `Lo siguiente no se anuncia hasta que este listo`

Copy:

- `Iremos abriendo nuevas integraciones cuando el caso real este bien resuelto. Hoy la referencia publica es Holded + ChatGPT.`

Formato visual:

- 2 o 3 cards con estado `Proximamente` o `Bajo demanda`
- sin nombres inventados si todavia no estan decididos

### Bloque 4: CTA de cierre

Titulo:

- `Empieza por una integracion real`

Texto:

- `Si ya trabajas con Holded, puedes activar hoy la primera integracion operativa de Verifactu Business y entrar a un flujo guiado de conexion.`

CTA principal:

- `Activar Holded + ChatGPT`

CTA secundaria:

- `Ver plataforma`

## Propuesta de ficha Holded + ChatGPT

### Objetivo editorial

Explicar el valor real de la integracion sin convertirla en un micrositio aislado ni en una promesa inflada. Esta ficha debe funcionar como pagina comercial canonica y como puente hacia `holded.verifactu.business`.

### Header

Usar el header y footer compartidos de `apps/landing`.

No crear navegacion propia de marca para esta pagina.

### Hero recomendado

Eyebrow:

- `Integraciones / Holded + ChatGPT`

Titular:

- `La primera integracion operativa de Verifactu Business ya esta aqui`

Alternativa de titular:

- `Holded + ChatGPT: contexto real para Isaak, sin salir de tu forma de trabajar`

Subtitulo:

- `Conecta Holded a traves de un flujo guiado y deja que Isaak te ayude a leer facturas, contactos, contabilidad y proyectos en lenguaje claro.`

CTA principal:

- `Activar Holded + ChatGPT`

CTA secundaria:

- `Ver Integraciones`

Trust line:

- `API key cifrada, uso server-side y alcance publico controlado.`

Visual recomendado:

- bloque hero con doble icono Holded + ChatGPT
- nota secundaria: `Dentro del ecosistema de Verifactu Business`
- evitar mockups recargados o claims de tesoreria total, compras o documentos no expuestos

### Bloque 1: Que resuelve

Titulo:

- `Que problema resuelve hoy`

Copy:

- `Si ya tienes datos en Holded, Isaak puede ayudarte a leer mejor lo importante sin obligarte a buscarlo entre menus. El objetivo no es replicar el ERP, sino ayudarte a entenderlo mejor y decidir antes.`

3 bullets:

- `Ver primero que facturas revisar.`
- `Entender mejor IVA, gastos y parte de la caja desde el contexto contable.`
- `Preparar un borrador sin perder tiempo.`

### Bloque 2: Que puede hacer hoy

Titulo:

- `Que puede hacer hoy`

Cards recomendadas:

- `Facturas emitidas`: `Listar facturas, revisar detalle y entender su estado.`
- `Contactos`: `Consultar clientes y priorizar accion comercial o de cobro.`
- `Contabilidad`: `Leer cuentas contables y movimientos del diario en lenguaje claro.`
- `Proyectos`: `Ver proyectos y tareas para detectar bloqueos o prioridades.`
- `Borradores`: `Preparar borradores de factura con confirmacion explicita.`

Nota editorial debajo:

- `La lectura de IVA, gastos y parte de tesoreria se deriva del contexto contable ya registrado en Holded.`

### Bloque 3: Que no prometemos todavia

Titulo:

- `Lo que no prometemos todavia`

Copy introductorio:

- `Preferimos ser claros con el alcance actual antes que generar expectativas incorrectas.`

Lista:

- `Productos e items`
- `Usuarios o datos de equipo`
- `Adjuntos como capacidad publica central`
- `Conciliacion bancaria`
- `Presupuestos, pedidos o albaranes`
- `Escritura amplia fuera del borrador de factura`

### Bloque 4: Como se activa

Titulo:

- `Como se activa`

Pasos:

- `1. Entras con tu cuenta.`
- `2. Pegas tu API key de Holded.`
- `3. Validamos la conexion y te dejamos listo el acceso.`

Copy corto:

- `No necesitas configuraciones tecnicas intermedias. Solo una activacion guiada y clara.`

CTA del bloque:

- `Ir a la activacion`

### Bloque 5: Privacidad y control

Titulo:

- `Privacidad y control desde el primer paso`

4 bullets:

- `La API key no se expone en cliente.`
- `La conexion se guarda cifrada.`
- `Las acciones de escritura requieren confirmacion.`
- `El acceso se limita al alcance publico definido.`

### Bloque 6: Cierre

Titulo:

- `Empieza con una integracion real, no con una promesa`

Texto:

- `Holded + ChatGPT es la primera integracion visible de Verifactu Business. Abre una forma mas clara de trabajar con tus datos sin romper tu operativa actual.`

CTA principal:

- `Activar Holded + ChatGPT`

CTA secundaria:

- `Hablar con el equipo`

## Recomendaciones visuales

### Sistema de marca

Base visual:

- usar header y footer de `apps/landing`
- mantener tipografia, espaciado y sistema de botones de `verifactu.business`
- mantener azul Verifactu como color estructural

Acento de integracion Holded:

- usar coral o rojo suave solo en badges, detalles o chips de la ficha Holded
- no convertir toda la experiencia a una marca paralela

### Iconografia

Pagina Integraciones:

- cards limpias, logos visibles, sin efecto marketplace recargado

Ficha Holded + ChatGPT:

- composicion de doble icono:
  - Holded
  - ChatGPT usando `brand/ChatGPT-Logo.svg.png`

### Comportamiento del subdominio Holded

`holded.verifactu.business` no deberia intentar ser la nueva landing corporativa.

Recomendacion:

- home publica del subdominio: minima, clara y orientada a activacion
- auth y onboarding: chrome reducido
- links visibles solo a privacidad, soporte y pagina canonica de la integracion en `verifactu.business`

## Plan de implementacion

### Fase 1

- rehacer `apps/landing/app/producto/integraciones/page.tsx` como catalogo real
- colocar `Holded + ChatGPT` como primera integracion disponible

### Fase 2

- rehacer `apps/landing/app/producto/integraciones/isaak-for-holded/page.tsx` con la estructura y copy propuestos
- retirar claims antiguos que mezclan capacidades internas o futuras

### Fase 3

- convertir `apps/landing/app/holded/page.tsx` en redireccion, alias editorial o pagina no indexable
- evitar que compita con la ficha canonica

### Fase 4

- ajustar `apps/holded/app/page.tsx` para que funcione como activacion especializada, no como segunda landing corporativa
- dejar header/footer minimos y foco en activacion

## Decisiones de contenido que deben mantenerse

- hablar de `Holded + ChatGPT` como integracion, no como producto independiente
- presentar a Verifactu Business como marca principal
- presentar a Isaak como capa de criterio y explicacion
- mantener el alcance publico real del beta
- evitar promesas de familias todavia no expuestas publicamente

## Resumen ejecutivo

La estructura correcta es esta:

- `verifactu.business` cuenta la historia
- `Integraciones` ordena la oferta
- `Holded + ChatGPT` demuestra que la oferta ya es real
- `holded.verifactu.business` convierte esa historia en activacion guiada

No necesitamos mas paginas. Necesitamos una sola narrativa publica bien jerarquizada.
