# Verifactu Business — Política de Precios (v1)

> **Fecha:** 2026-01-07  
> **Estado:** Activa  
> **Ámbito:** Suscripción mensual + cálculo por uso (empresas, facturas emitidas y movimientos bancarios procesados)

---

## 0) Resumen ejecutivo (1 minuto)

- **Cobro mensual** (no anual por ahora).
- **1 mes de prueba gratis**: durante la prueba medimos tu uso y te mostramos la **cuota propuesta** del siguiente ciclo.
- **Aviso previo**: siempre notificamos antes de la renovación el importe previsto (**X € + IVA**).
- **Cuota basada en uso** del periodo anterior:
  - **Empresas activas**
  - **Facturas emitidas**
  - **Movimientos bancarios procesados** (solo si el usuario activa conciliación; puede ser 0)
- **Importación por Excel**: cuenta igual que la conexión bancaria si se procesa como registros.
- **Sin precio 0**: mínimo **1 empresa** y **1 factura** en la calculadora (movimientos puede ser 0).

---

# PARTE A  INTERNO (CONFIDENCIAL)

## A1) Objetivo del modelo
Diseñar un pricing:
- predecible para el cliente (sin "facturas sorpresa"),
- automatizable (mínimo soporte humano),
- alineado a coste real (IA/OCR y conciliación escalan con volumen),
- defendible en disputas (definiciones, deduplicación, vista previa en importaciones).

## A2) Métricas facturables (definiciones internas)
### A2.1 Empresa activa
Empresa que en el periodo de facturación cumple al menos uno:
- 1 factura emitida registrada, o
- 1 registro procesado (p. ej. movimiento importado / documento contable), o
- 1 conexión bancaria activa con transacciones importadas en el periodo

**Nota:** "empresa creada" sin actividad NO debería contar.

### A2.2 Factura emitida (conteo)
Cuenta 1 por cada factura/rectificativa emitida que:
- se registra como documento final (no borrador),
- con campos mínimos válidos (fecha, identificador/serie+número, emisor/receptor, importes).

No cuenta:
- borradores,
- documentos rechazados por validación,
- duplicados detectados por id/serie+número.

### A2.3 Movimiento bancario procesado
Cuenta 1 por cada transacción bancaria importada y persistida como registro usable (desde PSD2 o Excel).

No cuenta:
- duplicados detectados (ver A5),
- previsualizaciones no confirmadas,
- registros rechazados por validación.

## A3) Tramos de precio (v1)  configuración
> Estos números son los que verá la calculadora (orientativos). En Stripe se implementarán como precios/tiered logic.

### Base
- **Base plataforma:** 19 €/mes (incluye 1 empresa activa)

### Empresas (desde la 2ª)
- **+7 € / mes** por empresa activa adicional

### Facturas emitidas / mes (min 1)
- 150: +0 €
- 51200: +6 €
- 201500: +15 €
- 5011.000: +29 €
- 1.0012.000: +49 €
- (opcional futuro) >2.000: escalado adicional o revisión

### Movimientos / mes (puede ser 0)
> Solo aplica si "Conciliación bancaria" está activada.
- 0: +0 €
- 1200: +6 €
- 201800: +15 €
- 8012.000: +35 €
- 2.0015.000: +69 €
- (opcional futuro) >5.000: escalado adicional o revisión

## A4) Trial (1 mes gratis)  lógica
- Durante el trial se permite uso completo.
- Mostramos "Cuota estimada próximo ciclo" calculada por uso acumulado del mes.
- En los últimos 57 días del trial enviamos aviso de la cuota propuesta.

**Recomendación operativa:** solicitar método de pago al iniciar prueba para mejorar conversión, pero siempre avisar del importe antes de cobrar.

## A5) Deduplicación y "anti-discusión"
### Movimientos
Deduplicación recomendada por clave compuesta (ideal):
- account_id/iban + booking_date + amount + currency + normalized_description + (provider_tx_id si existe)

Si un movimiento se re-importa (Excel o PSD2) y se detecta duplicado:
- no se vuelve a contar.

### Facturas
- Si coincide serie+número+fecha+NIF emisor (o id interno)  duplicado.

## A6) Avisos y confirmación "silenciosa"
### Aviso estándar (siempre)
- 57 días antes: aviso in-app (Isaak) con:
  - próxima cuota **X € + IVA**
  - desglose de uso (empresas, facturas, movimientos)
  - CTA "Abrir ticket"

### Umbral de confirmación explícita (opcional recomendado)
Activar confirmación solo si:
- sube  25% vs mes anterior **o**
- sube  30 € vs mes anterior

Acción:
- mostrar banner "requiere confirmación"
- si no confirma, mantener tramo anterior 1 ciclo o limitar importación de excedentes (definir estrategia).

## A7) Soporte y disputas
- Se considera "fuente de verdad" el contador interno de registros procesados.
- Se ofrece export de "uso del periodo" (auditable) bajo demanda.
- Si hay error verificable (bug/dedupe), se aplica ajuste crédito en el siguiente ciclo.

## A8) Mapa para Stripe (implementación futura)
- Producto "Verifactu Business  Subscription (Monthly)"
- Componentes de precio:
  - base (flat recurring)
  - empresas (quantity = active_companies)
  - facturas (tiered add-on por tramo)
  - movimientos (tiered add-on por tramo; solo si banking_enabled)
- En v1 se puede calcular el total en backend y usar un price único por tramo; en v2 pasar a metered/tiered en Stripe Billing.

---

# PARTE B  PÚBLICO (para Términos y Condiciones / Web)

## B1) Cómo se calcula el precio
Verifactu Business se factura **mensualmente**. La cuota se determina en función del uso del periodo anterior, principalmente por:
1) **Empresas activas**
2) **Facturas emitidas**
3) **Movimientos bancarios procesados** (solo si activas la conciliación bancaria; puede ser 0)

La calculadora de precios ofrece una **estimación orientativa**.

## B2) Prueba gratuita
Ofrecemos **1 mes de prueba gratis**. Durante la prueba:
- podrás usar la plataforma,
- mediremos el uso real,
- y te mostraremos la **cuota prevista del siguiente ciclo** antes de cobrar.

## B3) Aviso previo de renovación
Antes de cada renovación te notificaremos la **cuota prevista (importe + IVA)** y un resumen del uso (empresas, facturas y movimientos, si aplica).

## B4) Definiciones
### Empresa activa
Empresa con actividad durante el periodo (por ejemplo, emisión de facturas o registros procesados).

### Factura emitida
Documento de factura (incluidas rectificativas) emitido y registrado como final. Borradores o documentos rechazados no se contabilizan.

### Movimiento bancario procesado
Transacción importada (por conexión bancaria o por archivo Excel) que se procesa y registra como movimiento en la plataforma. Movimientos duplicados detectados automáticamente no se contabilizan.

## B5) Conciliación bancaria (opcional)
La conciliación bancaria es una función opcional. Si no se activa, los movimientos bancarios pueden ser **0** y no se aplica el componente de precio asociado a movimientos.

## B6) Importación por Excel
La importación por Excel está disponible. Si los datos se procesan y se registran como movimientos/documentos en la plataforma, se contabilizan dentro de los límites correspondientes del periodo.

## B7) Impuestos
Los precios mostrados en la plataforma se entienden **sin IVA** salvo que se indique lo contrario. El IVA aplicable se mostrará antes de finalizar el pago y/o en la factura.

## B8) Cambios en la política de precios
Podemos actualizar la política de precios. Si los cambios afectan a tu cuota, te lo comunicaremos con antelación razonable.

---

## Historial de cambios
- v1 (2026-01-07): Primera versión.
