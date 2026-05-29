# Isaak — Plan de Integraciones Sectoriales

> ⚠️ **V1 LAUNCH (2026-05-28)** — Las integraciones sectoriales (HotelGest, Revo, Nubimed, Inmovilla…) están **escondidas en V1**. Reactivación prevista en **V3.0** (≈ 6 meses post-V1). Pricing reescrito en [`ISAAK_LAUNCH_V1_2026-05-28.md`](../product/ISAAK_LAUNCH_V1_2026-05-28.md) — el plan Business 149€ referenciado abajo está archivado.

**Creado**: 2026-05-25
**Estado**: Documento vivo — pivote estratégico confirmado · pausado para V1

---

## Visión: del ERP genérico al software sectorial

### El cambio de modelo

```
ANTES:  Cliente usa ERP contable (Holded/Sage/A3) → Isaak lee la contabilidad
AHORA:  Cliente usa su software de gestión sectorial → Isaak ES su capa fiscal/contable/IA
```

Para un hotel, **HotelGest ya es su ERP**. Para un restaurante, **Revo XEF ya es su ERP**.
No necesitan Holded por separado: Isaak conecta directamente con el software que ya usan
y añade encima la capa fiscal, contable y de inteligencia de negocio.

### Por qué este modelo es mejor

| Dimensión           | ERP genérico (Holded/Sage)                | Software sectorial                                |
| ------------------- | ----------------------------------------- | ------------------------------------------------- |
| Adopción            | El cliente tiene que tener Holded         | Ya lo usa cada día                                |
| Datos               | Contables genéricos                       | Ricos + sectoriales (reservas, citas, tickets...) |
| Valor IA            | Fiscal básico                             | Fiscal + KPIs sectoriales + operaciones           |
| Diferenciación      | Cualquier competidor puede hacer lo mismo | Isaak como copiloto vertical único                |
| Fricción onboarding | Alta (necesita configurar Holded)         | Mínima (una API key de su cuenta)                 |

---

## Arquitectura: dos capas por integración

```
┌─────────────────────────────────────────────────────┐
│                    ISAAK CHAT                        │
│   preguntas operativas + preguntas fiscales          │
└───────────────┬─────────────────────────────────────┘
                │
    ┌───────────▼────────────┐
    │     SectorClient       │  ← datos ricos del sector
    │  reservas, citas, POS  │    (específico por plataforma)
    └───────────┬────────────┘
                │
    ┌───────────▼────────────┐
    │   FiscalNormalizer     │  ← extrae: ingresos, IVA, clientes,
    │   (por sector)         │    pagos pendientes, categorías
    └────────────────────────┘
```

Cada integración sectorial implementa **dos interfaces**:

1. **`SectorClient`** — datos propios del sector (rico, específico)
2. **`FiscalView`** — vista normalizada para modelos 303/130/390, conciliación, alertas

---

## Mapa de integraciones — estado y prioridad

| #   | Sector                 | Plataforma       | API         | Auth              | Docs                            | Estado               |
| --- | ---------------------- | ---------------- | ----------- | ----------------- | ------------------------------- | -------------------- |
| 1   | **Hoteles**            | **HotelGest**    | ✅ Existe   | API key (cliente) | Portal cliente                  | 🔄 En implementación |
| 2   | **Inmobiliarias**      | **Inmovilla**    | ✅ Pública  | Token settings    | `procesos.inmovilla.com/api/v1` | ⏳ Backlog P1        |
| 3   | **Restaurantes**       | **Revo XEF**     | ✅ Partner  | Token back-office | `api.revo.works`                | ⏳ Backlog P1        |
| 4   | **Clínicas/Dental**    | **Nubimed**      | ✅ Pública  | API key (cliente) | `nubimed.stoplight.io`          | ⏳ Backlog P1        |
| 5   | **Gimnasios**          | **TeamUp**       | ✅ Gratuita | API key           | `apidocs.teamup.com`            | ⏳ Backlog P2        |
| 6   | **Comercio/Retail**    | **Loyverse POS** | ✅ Gratuita | OAuth 2.0         | `developer.loyverse.com`        | ⏳ Backlog P2        |
| 7   | **Talleres mecánicos** | **RepairShopr**  | ✅ Swagger  | API key           | Swagger docs                    | ⏳ Backlog P2        |

### Plataformas descartadas (por ahora)

| Plataforma        | Motivo                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Chift             | Cuenta pendiente activación manual; ERPs genéricos no son la prioridad                   |
| Sage 200c         | Docs cerradas, requiere partnership enterprise                                           |
| A3innuva          | Requiere credenciales `a3developers.wolterskluwer.es`                                    |
| Holded (como ERP) | Se mantiene como conector legacy para clientes existentes; no es la línea de crecimiento |

---

## Sprint 1: HotelGest (piloto con cliente real)

### Contexto

- Cliente: 3 hoteles con acceso total a HotelGest
- API key disponible
- Documentación: portal interno (acceso vía cliente)
- Objetivo: implementación completa en 1 sprint

### Datos disponibles en HotelGest (a mapear con cliente)

```
Reservas        → id, fechas, habitación, régimen, importe, estado, canal
Facturas        → id, número, fecha, cliente, líneas, IVA, total, estado pago
Huéspedes       → id, nombre, NIF/passport, email, teléfono, procedencia
Habitaciones    → id, tipo, tarifa, disponibilidad, ocupación
Informes        → ocupación %, RevPAR, ADR, ingresos por período
SES.Hospedajes  → partes de viajeros (obligatorio 24h)
```

### SectorClient interface (HotelGest)

```typescript
interface HotelSectorClient {
  // Reservas
  listReservations(params?: {
    from?: string;
    to?: string;
    status?: string;
  }): Promise<HotelReservation[]>;
  getReservation(id: string): Promise<HotelReservation | null>;

  // Facturas
  listInvoices(params?: { from?: string; to?: string }): Promise<HotelInvoice[]>;

  // Huéspedes
  listGuests(params?: { limit?: number }): Promise<HotelGuest[]>;

  // KPIs
  getOccupancyReport(from: string, to: string): Promise<HotelOccupancyReport>;
  getRevenueReport(from: string, to: string): Promise<HotelRevenueReport>;

  // Snapshot para system prompt
  getSnapshot(params?: { from?: string; to?: string }): Promise<HotelSnapshot>;
}
```

### FiscalView (HotelGest → fiscal normalizado)

```typescript
interface HotelFiscalView {
  // IVA desglosado (10% hostelería + 21% otros servicios)
  getVatBreakdown(
    from: string,
    to: string
  ): Promise<{
    base10: number;
    vat10: number; // habitaciones, restaurante
    base21: number;
    vat21: number; // artículos premium, eventos
    base0: number; // si aplica
  }>;

  // Para modelo 303
  get303Data(trimestre: string): Promise<Modelo303Draft>;

  // Cobros pendientes
  getPendingPayments(): Promise<HotelInvoice[]>;
}
```

### Herramientas LLM (chat tools)

```typescript
// Tools que Isaak tendrá disponibles cuando HotelGest está conectado
const HOTELGEST_TOOLS = [
  'hotel_list_reservations', // listar reservas por período
  'hotel_get_reservation', // detalle de una reserva
  'hotel_list_invoices', // facturas emitidas
  'hotel_get_occupancy_report', // % ocupación por período
  'hotel_get_revenue_report', // ingresos por habitación/servicio
  'hotel_get_kpis', // RevPAR, ADR, pendientes de cobro
  'hotel_list_guests', // huéspedes registrados
];
```

### Ejemplos de queries con datos reales

```
"¿Cuántas reservas confirmadas tenemos para julio?"
"¿Cuál es la ocupación media del último trimestre?"
"¿Qué facturas de clientes están pendientes de cobro?"
"Prepárame el desglose de IVA para el modelo 303 de este trimestre"
"¿Qué canal de reservas genera más ingresos?"
"¿Cuál es el RevPAR de este mes vs el año pasado?"
```

### Archivos a crear/modificar

```
apps/isaak/app/lib/hotelgest-erp-client.ts    — Implementar (stub → real)
apps/isaak/app/api/isaak/hotelgest/           — Routes: connect, status, disconnect
apps/isaak/app/(workspace)/hotelgest/         — Workspace page
packages/db/prisma/schema.prisma              — Modelo HotelgestConnection si necesario
```

### Variables de entorno

No requiere variables propias — usa la API key del cliente cifrada en `ExternalConnection.apiKeyEnc`.

---

## Sprint 2: Inmovilla (inmobiliarias)

### Contexto

- Documentación pública: `https://procesos.inmovilla.com/api/v1/`
- Auth: token generado en Configuración → Opciones → Token para API Rest
- Token caduca a los 3 meses de inactividad
- Contacto soporte: `ladesk@inmovilla.com`

### Datos clave

```
Propiedades    → id, tipo, dirección, precio, estado, fotos, características
Clientes       → id, nombre, email, teléfono, tipo (comprador/vendedor/alquiler)
Operaciones    → id, tipo (venta/alquiler), precio, comisión, fecha, estado
Agentes        → id, nombre, cartera
Visitas        → id, propiedad, cliente, fecha, resultado
```

### Valor fiscal único (inmobiliarias)

- Comisiones: retención IRPF 15% para autónomos
- IVA repercutido 21% en operaciones de alquiler comercial
- Arrendamiento vivienda: exento IVA (Art. 20 LIVA)
- Modelo 347: operaciones con terceros > 3.005,06 €

---

## Sprint 3: Revo XEF (restaurantes)

### Contexto

- Documentación: `https://api.revo.works/`
- Auth: token en back-office del restaurante (partner/cliente)
- Nativo español, 50+ integraciones

### Datos clave

```
Pedidos/Tickets → id, fecha, mesa, líneas, totales por tipo IVA, método pago
Productos       → id, nombre, precio, categoría, impuesto
Cierre diario   → ventas totales, desglose IVA, propinas, devoluciones
Personal        → turnos, cierres de caja
```

### Valor fiscal único (restaurantes)

- IVA reducido 10% (alimentos/hostelería) vs 21% (alcohol, tabaco)
- Régimen de módulos para pequeños restaurantes
- Propinas: no sujetas a IVA, pero sí a IRPF trabajador
- Modelo 303 con desglose por tipo impositivo automático

---

## Sprint 4: Nubimed (clínicas)

### Contexto

- Documentación: `https://nubimed.stoplight.io/docs/api`
- Auth: API key del cliente (desde la cuenta clínica)
- 1.500+ clínicas españolas

### Datos clave

```
Citas           → id, paciente, profesional, servicio, fecha, estado, importe
Pacientes       → id, nombre, NIF, email, teléfono, historial
Facturas        → id, paciente, líneas, IVA, total, estado pago
Profesionales   → id, especialidad, horario, colegiado
Tratamientos    → id, nombre, precio, tipo (10%/21%/exento)
```

### Valor fiscal único (clínicas)

- Servicios sanitarios: exentos IVA (Art. 20 LIVA) si los presta médico titulado
- Servicios estéticos/cosméticos: 21% IVA
- Prótesis dentales: 10% IVA
- Retenciones IRPF 15% a médicos autónomos colaboradores
- Modelo 347 con compras a laboratorios

---

## Roadmap de implementación

```
2026 Q2   HotelGest piloto con cliente real (3 hoteles)
2026 Q3   Inmovilla + Nubimed (docs públicas → sin cliente piloto)
2026 Q3   Revo XEF (programa partners)
2026 Q4   TeamUp + Loyverse + RepairShopr
2027 Q1   Nuevos sectores según demanda (educación, construcción, transporte)
```

---

## Modelo de negocio de las integraciones

Las integraciones sectoriales forman parte del plan **Business (149 €/mes)**:

```
Free/Starter  → Chat fiscal general + VeriFactu
Pro           → + Google/Microsoft + Open Banking
Business      → + Software sectorial (hotel, clínica, inmobiliaria, restaurante)
              + Modo Asesoría multi-cliente
              + Modelos AEAT pre-rellenados
```

Add-on disponible en Starter+: **Software sectorial adicional → 15 €/mes por integración**.

---

## Arquitectura técnica: cómo se conecta

```
1. Cliente abre Isaak → Integraciones → [HotelGest / Inmovilla / Revo / ...]
2. Pega su API key de la cuenta del software
3. Isaak cifra con AES-256-GCM y guarda en ExternalConnection
4. Factory devuelve el SectorClient correcto según provider
5. Chat route detecta provider → carga snapshot sectorial → enriquece system prompt
6. Usuario pregunta → Isaak usa tools sectoriales con datos reales
```

### Schema Prisma (sin cambios necesarios)

`ExternalConnection` ya soporta cualquier provider con `apiKeyEnc`. Sólo hay que añadir el valor `'hotelgest' | 'inmovilla' | 'revo' | 'nubimed'` al enum `ErpProvider`.

---

## Notas de implementación

### Seguridad

- API keys siempre cifradas con `HOLDED_KEY_SECRET` (mismo mecanismo que Holded)
- Los datos del hotel/clínica/inmobiliaria son confidenciales — nunca en logs
- Strict tenant isolation en todas las queries

### Rate limits

- HotelGest: desconocido, implementar retry con backoff exponencial
- Inmovilla: documentado "no usar para cargas masivas diarias"
- Revo XEF: información en docs de partner

### Datos sensibles (clínicas)

- Historiales médicos: **nunca** incluir en system prompt
- Solo datos administrativos (citas, facturación) en el contexto IA
- Cumplimiento RGPD: base legal → contrato prestación de servicios
