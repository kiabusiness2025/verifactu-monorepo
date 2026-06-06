# Isaak — Cobertura sectorial

**Última actualización**: 2026-06-04

Isaak conecta con el software de gestión que el cliente ya usa. No reemplaza al ERP del cliente — actúa como capa de inteligencia fiscal-contable encima de él.

> Plan estratégico de fondo: `docs/engineering/ISAAK_MASTER_PLAN.md` § Plan H · `docs/engineering/SECTOR_INTEGRATIONS_PLAN.md`.

## Resumen de cobertura

| Sector              | Software                 | Adapter                                        | Profundidad | Estado          |
| ------------------- | ------------------------ | ---------------------------------------------- | ----------- | --------------- |
| Hoteles             | HotelGest                | `hotelgest-erp-client.ts`                      | Partial     | ✅ Operativo    |
| Restauración        | Revo XEF                 | `revo-erp-client.ts`                           | Partial     | ✅ Operativo    |
| Retail/Comercio     | Loyverse                 | `loyverse-erp-client.ts`                       | Partial     | ✅ Operativo    |
| E-commerce          | WooCommerce              | `woocommerce-erp-client.ts`                    | Partial     | ✅ Operativo    |
| E-commerce          | PrestaShop               | `prestashop-erp-client.ts`                     | Partial     | ✅ Operativo    |
| Bienestar / Gym     | Mindbody                 | `mindbody-erp-client.ts`                       | Partial     | ✅ Operativo    |
| Inmobiliarias       | Inmovilla                | `inmovilla-erp-client.ts`                      | Partial     | ✅ Operativo    |
| Clínicas / Dental   | Nubimed                  | `nubimed-erp-client.ts`                        | Partial     | ✅ Operativo    |
| Contable genérico   | Holded                   | `holded-erp-client.ts`                         | Full        | ✅ Operativo    |
| Banking (PSD2)      | EnableBanking            | `enable-banking.ts` + adapter                  | Full        | ✅ Operativo    |
| Banking (no-PSD2)   | Salt Edge                | salt-edge integration                          | Full        | ✅ Operativo    |

> Nota profundidad sectoriales (2026-06-04): los adapters sectoriales (HotelGest/Revo/Loyverse/WooCommerce/PrestaShop/Mindbody/Inmovilla/Nubimed) hoy devuelven ledger vacío porque las APIs origen no exponen asientos contables, y el contrato `ErpClient` actual no incluye método de creación de documento. La reconciliación con el ledger nativo F9 se hace vía importer dedicado por sector (no por el adapter mismo). Sub-task 3F de `REFACTOR_PLAN.md` consolidará capabilities + writes en la abstracción canónica.
| Gimnasios           | TeamUp                   | —                                              | —           | ⏳ Backlog P2   |
| Talleres            | RepairShopr              | —                                              | —           | ⏳ Backlog P2   |
| Contable genérico   | Chift (Sage/A3/Odoo…)    | `chift-erp-client.ts`                          | —           | ⏸️ Suspendido   |

## Definición de profundidad

| Nivel       | Lectura                                                                    | Escritura (vía adapter)                                  | Ledger del adapter                                | Reconcile con ledger F9                          |
| ----------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| **Full**    | Contactos, ventas, compras, productos, ledger contable                     | Crear documento con consent humano (vía `ErpClient`)     | Asientos contables expuestos por la API origen   | Importer dedicado sobre datos del propio adapter |
| **Partial** | Subset operativo relevante (ventas + cobros + catálogo, según el sector)   | No expuesta hoy (contrato `ErpClient` aún sin write CRUD)| Vacío — la API origen no expone libro contable    | Importer dedicado deriva asientos desde ventas    |
| **Planned** | Investigación de API + scoping                                             | —                                                        | —                                                 | —                                                |

> Sólo Holded cumple hoy la definición Full (lectura+escritura+ledger contable). Banking (EnableBanking + Salt Edge) cumple Full a nivel banking (cuentas + transacciones + reconcile). El resto son Partial mientras 3F no añada capabilities + write CRUD al contrato.

## Política multi-adapter

- Toda la lógica fiscal AEAT (modelos 303/130/111/180/190/347/349, Inspector 51 reglas) opera sobre el **ledger nativo F9-L5**, no sobre el adapter.
- Cada adapter es responsable de normalizar al modelo canónico y emitir entradas de ledger reconciliadas vía importer.
- Banking se reconcilia separado: cuentas + transacciones del adapter banking se cruzan con ledger F9 vía `entry_reference`.

## Gaps activos

| Sector            | Software           | Bloqueador                                     |
| ----------------- | ------------------ | ---------------------------------------------- |
| Gimnasios         | TeamUp             | No hay piloto que valide el adapter            |
| Talleres          | RepairShopr        | No hay piloto que valide el adapter            |
| Contable genérico | Chift              | Activación de cuenta bloqueada en `support@chift.eu` |
| Laboral           | Sage 200 Labour    | Fase V3 — no priorizado                        |
| Laboral           | A3NOM              | Fase V3 — no priorizado                        |

## Próximos pasos por prioridad

1. **Consolidar adapters existentes en `packages/erp-abstraction`** (sub-task 3F del refactor plan).
2. **Documentar profundidad real** de cada adapter Partial → identificar qué falta para Full.
3. **TeamUp + RepairShopr**: scoping API → adapter cuando haya cliente piloto.
4. **Laboral (V3)**: ver `docs/engineering/ISAAK_MASTER_PLAN.md` § H.7.
