# Integración HotelGest — Guía de implementación

**Estado**: Stub implementado — pendiente API docs del cliente piloto  
**Prioridad**: P1 activo  
**Sector**: Hoteles y establecimientos de alojamiento  
**Arquitectura**: `HotelgestErpClient implements ErpClient` + `CompanyIntelligenceService`

---

## Por qué HotelGest

HotelGest es el PMS (Property Management System) de referencia para hoteles independientes y pequeñas cadenas en España. Para un cliente con HotelGest, **HotelGest ya es su ERP**. No necesita Holded para llevar la facturación de alojamiento: todo pasa por HotelGest.

Isaak actúa como la capa de inteligencia fiscal y de negocio encima:

```
HotelGest (operaciones, reservas, facturación)
    ↓
Isaak (IA fiscal, alertas, KPIs, asesoramiento)
    ↑
Open Banking (conciliación de cobros)
    ↑
Holded (solo si el cliente también lleva contabilidad formal ahí — opcional)
```

### Posicionamiento ante el cliente hotel

| Pregunta                        | Respuesta                                                          |
| ------------------------------- | ------------------------------------------------------------------ |
| ¿Tengo que cambiar de software? | No. Sigues con HotelGest tal cual.                                 |
| ¿Necesito Holded?               | Solo si ya lo tienes para contabilidad formal.                     |
| ¿Qué aporta Isaak?              | Inteligencia fiscal + alertas proactivas + CFO digital en un chat. |
| ¿Cómo se conecta?               | API key de tu cuenta HotelGest. Listo en 2 minutos.                |

---

## Arquitectura técnica

### Ficheros relevantes

| Fichero                                   | Responsabilidad                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `app/lib/erp-client.ts`                   | Interface `ErpClient` — contrato base para todos los conectores               |
| `app/lib/hotelgest-erp-client.ts`         | `HotelgestErpClient implements ErpClient` — **pendiente implementación real** |
| `app/lib/erp-client-factory.ts`           | Factory: case `'hotelgest'` → `HotelgestErpClient`                            |
| `app/lib/company-intelligence-service.ts` | `CompanyIntelligenceService.buildProfile()` — Ficha Empresa automática        |
| `app/lib/company-intelligence-rules.ts`   | Motor de reglas C001-C007 + R040A/R040B                                       |

### Interface ErpClient (extracto)

```typescript
interface ErpClient {
  readonly provider: ErpProvider; // 'hotelgest'
  listInvoices(params?: ListInvoicesParams): Promise<ErpInvoice[]>;
  listContacts(params?: ListContactsParams): Promise<ErpContact[]>;
  getSnapshot(): Promise<ErpSnapshot>; // Usado por el chat route
  // …más métodos
}
```

### Datos que Isaak necesita de HotelGest

Una vez que se disponga de las docs de la API del cliente piloto, `HotelgestErpClient` debe
implementar al menos:

#### Facturación / Ingresos

| Endpoint HotelGest       | Mapeado a ErpInvoice | Notas                                  |
| ------------------------ | -------------------- | -------------------------------------- |
| Facturas de estancia     | `type: 'invoice'`    | Huésped = contacto, importe neto + IVA |
| Facturas de servicios    | `type: 'invoice'`    | Restauración, spa, extras              |
| Abonos / anulaciones     | `type: 'creditnote'` | —                                      |
| Presupuestos / pro-forma | `type: 'estimate'`   | —                                      |

#### Clientes / Contactos

| Campo HotelGest             | Mapeado a ErpContact | Notas                                |
| --------------------------- | -------------------- | ------------------------------------ |
| Empresa o apellidos         | `name`               | —                                    |
| NIF / DNI / pasaporte       | `nif`                | Puede ser NIE o documento extranjero |
| Email                       | `email`              | —                                    |
| Tipo (empresa / particular) | `type: 'client'`     | —                                    |

#### KPIs del hotel (sector-específico)

Estos datos van más allá del interface `ErpClient` base y se implementan como métodos
adicionales de `HotelgestErpClient`:

```typescript
interface HotelKpis {
  occupancyRate: number; // % ocupación (periodo)
  revPar: number; // Revenue Per Available Room
  adr: number; // Average Daily Rate
  totalRooms: number;
  occupiedRooms: number;
  revenue: { alojamiento: number; servicios: number; total: number };
  period: { from: string; to: string };
}
```

---

## Flujo de chat (qué puede hacer Isaak con HotelGest conectado)

### Preguntas operativas

```
"¿Cuál es la ocupación media de este mes?"
  → HotelgestErpClient.getHotelKpis() → Isaak formatea respuesta

"¿Qué reservas tenemos pendientes de pago?"
  → HotelgestErpClient.listInvoices({ status: 'sent' }) → Isaak alerta

"¿Cuánto hemos ingresado por restauración esta semana?"
  → HotelgestErpClient.listInvoices({ type: 'invoice', category: 'restauracion' })
```

### Preguntas fiscales (generadas desde los datos HotelGest)

```
"¿Cuánto IVA tengo que declarar este trimestre?"
  → Suma de tax en ErpInvoice[] → estimación modelo 303

"¿Qué facturas no tienen NIF de cliente?"
  → listContacts() → filtrar nif: undefined → alerta C001 de Company Intelligence

"¿Qué retenciones de IRPF tengo este mes?"
  → Facturas de servicios profesionales con retención → estimación modelo 111
```

### Alertas proactivas (SES.Hospedajes)

```
🔴 ALERTA: Tienes 3 huéspedes sin parte de viajero comunicado a la Policía Nacional.
   Plazo máximo: 24h desde check-in. Riesgo de sanción.
   [Ver huéspedes afectados]
```

**SES.Hospedajes** es la obligación legal de todo establecimiento de alojamiento en España
de comunicar los partes de viajero a la Policía Nacional / Guardia Civil en un máximo de 24 horas
desde el check-in. Isaak genera esta alerta automáticamente a partir de los datos de reservas de
HotelGest.

---

## Company Intelligence + HotelGest

Cuando un hotel conecta HotelGest, Isaak construye automáticamente la **Ficha Empresa** del hotel:

```typescript
const profile = await service.buildProfile({
  legalName: tenant.companyName,
  nif: tenant.nif,
  province: tenant.province,
  declaredTaxResidence: 'REGIMEN_COMUN', // o CANARIAS si aplica
  hasEmployees: true, // hoteles casi siempre tienen
  hasRentWithholding: true, // alquiler de local habitual
  usesBillingSoftware: true, // HotelGest = software de facturación
  annualTurnover: derivadoDeHotelGest, // suma de ErpSnapshot
});

const alerts = runCompanyIntelligenceRules(profile);
// → R040A: "Tu empresa deberá usar VeriFactu/SIF a partir del 1 enero 2027"
// → C005 si no se ha declarado territorio fiscal
```

### Casos específicos hoteles en Canarias

Los hoteles en Canarias tienen IGIC (7%) en lugar de IVA general (10% alojamiento).
La Ficha Empresa detecta automáticamente `taxResidence: 'CANARIAS'` e informa al
sistema de prompts para que Isaak use los tipos correctos.

---

## Configuración

### Variables de entorno

No hay variables globales de HotelGest — cada tenant guarda su propia API key cifrada:

```
Campo Prisma: ExternalConnection.credentials (AES-256-GCM con HOLDED_KEY_SECRET)
```

### Onboarding del tenant

1. El usuario abre `/integrations` en Isaak
2. Selecciona "HotelGest" en la categoría "Software Sectorial"
3. Introduce su API key de HotelGest (obtenida en su portal de cliente)
4. Isaak cifra la key y llama a `HotelgestErpClient.getSnapshot()` para validar
5. Si el snapshot llega correctamente → conexión verificada → Ficha Empresa se construye

### Pantalla en `/integrations`

```
[HotelGest]  Software de gestión hotelera
             Estado: ✅ Conectado / ❌ No conectado
             Última sincronización: hace 5 minutos
             [Configurar] [Desconectar]
```

---

## Estado de implementación

| Tarea                       | Estado | Notas                                                                    |
| --------------------------- | ------ | ------------------------------------------------------------------------ |
| `HotelgestErpClient` stub   | ✅     | `app/lib/hotelgest-erp-client.ts` compila y está en factory              |
| `ErpClient` interface       | ✅     | Completa con `ErpInvoice`, `ErpContact`, `ErpSnapshot`                   |
| Company Intelligence        | ✅     | Módulo completo con 88 tests, listo para conectar                        |
| SES.Hospedajes alert type   | ✅     | `FiscalObligation` y regla disponible en `company-intelligence-types.ts` |
| `listInvoices()` real       | ⏳     | Pendiente API docs del cliente piloto                                    |
| `listContacts()` real       | ⏳     | Pendiente API docs del cliente piloto                                    |
| `getHotelKpis()` real       | ⏳     | Método extra hotelero — pendiente docs                                   |
| `getSnapshot()` real        | ⏳     | Pendiente API docs                                                       |
| Alerta SES.Hospedajes       | ⏳     | Requiere endpoint de check-in HotelGest                                  |
| Tests con mocks HotelGest   | ⏳     | Pendiente una vez implementados los métodos                              |
| Integración IGIC (Canarias) | ⏳     | Pendiente confirmar datos de tenant piloto                               |

---

## Roadmap: de HotelGest + Isaak a Isaak solo

```
HOY
  HotelGest → operaciones, reservas, KPIs
  Isaak     → inteligencia fiscal y asesoramiento
  Holded    → contabilidad formal (opcional)
  Banco     → conciliación automática

PRÓXIMAMENTE (H2 2026)
  HotelGest → operaciones + KPIs (sigue siendo el PMS)
  Isaak     → contabilidad completa + impuestos presentados automáticamente
  Banco     → conciliación automática
  (Sin necesidad de Holded ni ningún ERP adicional)
```

Cuando Isaak implemente la generación de asientos contables y presentación directa de
modelos AEAT a partir de datos HotelGest + Open Banking, el cliente hotel tendrá
un **CFO digital completo** sin necesitar software adicional.

---

## Referencias

- `docs/isaak/COMPANY_INTELLIGENCE.md` — módulo de Ficha Empresa
- `docs/engineering/SECTOR_INTEGRATIONS_PLAN.md` — plan completo de integraciones sectoriales
- `docs/product/ISAAK_MASTER_PLAN.md` — posicionamiento y pricing
- `apps/landing/app/integraciones/hotelgest/page.tsx` — página pública de la integración
