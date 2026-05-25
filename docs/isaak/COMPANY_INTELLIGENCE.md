# Company Intelligence — Ficha Empresa

Módulo que construye perfiles fiscales-mercantiles automáticos de empresas a partir de datos del usuario y fuentes públicas oficiales.

## Principios de diseño

- **Trazabilidad total**: cada dato almacena fuente, fecha y nivel de confianza (`CompanyDataProvenance`).
- **Sin scraping agresivo**: no se consultan webs privadas (eInforma, Axesor, Infoempresa). Solo fuentes oficiales y open data.
- **Inferencia prudente**: las obligaciones fiscales son "probables", nunca definitivas.
- **Adapters mockeables**: todas las llamadas externas se inyectan via `fetchFn` → 100% testeable sin red.

## Archivos del módulo

| Archivo                                  | Responsabilidad                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `company-intelligence-types.ts`          | Tipos TypeScript: `CompanyProfile`, `CompanyProfileInput`, `CompanyMatch`, etc. |
| `company-intelligence-normalizers.ts`    | Normalización de nombres, NIF/CIF, VAT; validación de formato                   |
| `company-intelligence-scoring.ts`        | Puntuación 0-100 de coincidencia candidato vs. input (Jaro-Winkler + NIF/VAT)   |
| `company-intelligence-sources.ts`        | Interface `CompanyDataSourceAdapter` + 5 adapters                               |
| `company-intelligence-service.ts`        | `CompanyIntelligenceService` + inferencia de tipo contribuyente y obligaciones  |
| `company-intelligence-rules.ts`          | Reglas C001-C007 + R040A/R040B; motor de evaluación                             |
| `__tests__/company-intelligence.test.ts` | 88 tests unitarios                                                              |

## Fuentes de datos

| Adapter               | Source ID | Tipo                               | Datos                           |
| --------------------- | --------- | ---------------------------------- | ------------------------------- |
| `UserProvidedAdapter` | `USER`    | Sincrónico                         | Datos declarados por el usuario |
| `BormeAdapter`        | `BORME`   | HTTP (sin API pública de búsqueda) | Eventos registrales             |
| `ViesAdapter`         | `VIES`    | REST `ec.europa.eu`                | Validación VAT intracomunitaria |
| `GleifAdapter`        | `GLEIF`   | REST `api.gleif.org`               | LEI, nombre legal, jurisdicción |
| `PlacspAdapter`       | `PLACSP`  | ATOM (no-search)                   | Contratos sector público        |

## Flujo de buildProfile()

```
Input (CompanyProfileInput)
  │
  ├── UserProvidedAdapter.search()  ─┐
  ├── BormeAdapter.search()          ├── Paralelo → raw candidates
  ├── ViesAdapter.search()           │
  ├── GleifAdapter.search()         ─┘
  │
  ├── scoreCompanyMatch() por cada candidato
  ├── Ordenar por score DESC, tomar topMatch
  │
  ├── detectLegalForm(topMatch.legalName, topMatch.nif)
  ├── inferLikelyTaxpayerType(legalForm)
  ├── inferLikelyFiscalObligations(input, taxpayerType, vatRegime)
  ├── deriveCompanyWarningFlags(input, topMatch, vatRegime)
  │
  └── CompanyProfile
```

## Reglas

### C001–C007 — Validación e integridad

| ID   | Severidad | Condición                                |
| ---- | --------- | ---------------------------------------- |
| C001 | ERROR     | Falta NIF                                |
| C002 | ERROR     | Formato NIF inválido (dígito de control) |
| C003 | WARNING   | Forma jurídica no identificada           |
| C004 | WARNING   | Régimen de IVA no declarado              |
| C005 | WARNING   | Territorio fiscal no declarado           |
| C006 | WARNING   | Coincidencia mercantil de baja confianza |
| C007 | WARNING   | VAT intracomunitario no válido en VIES   |

### R040A / R040B — VeriFactu / SIF

Obligación legal de uso de Sistema de Información de Facturación certificado.

| Regla | Sujeto                | Fecha obligación | Severidad progresiva                    |
| ----- | --------------------- | ---------------- | --------------------------------------- |
| R040A | Sociedades            | 2027-01-01       | INFO → WARNING (−180d) → ERROR (pasada) |
| R040B | Autónomos y entidades | 2027-07-01       | INFO → WARNING (−180d) → ERROR (pasada) |

## Uso básico

```typescript
import { CompanyIntelligenceService } from '@/lib/company-intelligence-service';
import { runCompanyIntelligenceRules } from '@/lib/company-intelligence-rules';

const service = new CompanyIntelligenceService();
const profile = await service.buildProfile({
  legalName: 'Mi Empresa, S.L.',
  nif: 'B12345678',
  province: 'MADRID',
  declaredTaxResidence: 'REGIMEN_COMUN',
  hasEmployees: true,
  usesBillingSoftware: true,
  annualTurnover: 450_000,
});

const alerts = runCompanyIntelligenceRules(profile);
```

## Tests en modo mock

```typescript
import { ViesAdapter } from '@/lib/company-intelligence-sources';
import { CompanyIntelligenceService } from '@/lib/company-intelligence-service';

const mockFetch: typeof fetch = async () =>
  ({
    ok: true,
    json: async () => ({ valid: true, name: 'EMPRESA TEST SL' }),
  }) as Response;

const service = new CompanyIntelligenceService({
  adapters: [new ViesAdapter({ fetchFn: mockFetch })],
});
```

## Extensión — añadir nueva fuente

1. Implementar `CompanyDataSourceAdapter` con `sourceId` y `search()`.
2. Añadir a la lista de adapters por defecto en `CompanyIntelligenceService`.
3. Añadir nuevo `DataSource` en `company-intelligence-types.ts` si es necesario.
4. Escribir tests con `fetchFn` mockeado.

## Notas de seguridad

- El módulo NO almacena datos en base de datos — devuelve estructuras en memoria.
- Los adapters externos tienen timeout de 8 segundos y fallan silenciosamente (retornan `[]` o `null`).
- No se envía información del usuario a GLEIF/VIES salvo NIF o nombre de empresa (datos no sensibles).
