# Plan de implementación — Conectores ERP: Sage 200c + a3innuva

**Fecha:** 2026-05-21  
**Sprint:** P3-4 (post P3-3 Modelos AEAT)  
**Esfuerzo estimado:** XL — 3 sprints de 2 semanas  
**Prerequisito:** P3-3 Modelos AEAT completado (la capa ERP genérica se aprovecha directamente)

---

## 1. Estado actual del mercado API

### Sage 200c (Sage España)

| Aspecto                | Detalle                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| Portal                 | https://developer.sage.com/200c                                                                  |
| Auth                   | OAuth 2.0 Authorization Code + refresh token                                                     |
| Protocolo              | REST + OData v4                                                                                  |
| Webhooks               | ✅ Soportados                                                                                    |
| Entidades clave        | customers, suppliers, items, stock, orders, invoices, accounting entries, banking, CRM           |
| Activación por cliente | El cliente va a "Sage Soluciones Conectadas" → activa la integración → flujo OAuth               |
| Cobertura              | Pymes medianas 10–100 empleados. Producto SaaS. Mayor base instalada en España para ese segmento |
| Limitación             | Sage 50 / Contaplus desktop → **sin API REST pública** (ODBC o SDK de pago)                      |

### A3innuva (Wolters Kluwer)

| Aspecto         | Detalle                                                                               |
| --------------- | ------------------------------------------------------------------------------------- |
| Portal          | https://a3developers.wolterskluwer.es/ (1.400+ devs)                                  |
| Auth            | OAuth 2.0 + header `Ocp-Apim-Subscription-Key` (APIM gateway)                         |
| Protocolo       | REST JSON                                                                             |
| Webhooks        | ✅ Solo en a3factura confirmado                                                       |
| Entidades clave | invoices, contacts, chart of accounts, journal entries, employees, orders, stock      |
| SDK             | C# en GitHub (`es-wolters-kluwer/a3innuva.Importia.SDK`) — solo lectura de referencia |
| Cobertura       | Clientes que han migrado a la nube (a3innuva). Desktop a3ASESOR / a3nom → **sin API** |
| Limitación      | Penetración SaaS menor que Sage 200c. Muchos clientes siguen en desktop               |

### Productos sin API REST pública (estrategia diferente)

| Producto                          | Alternativa                                                      |
| --------------------------------- | ---------------------------------------------------------------- |
| Sage 50 / Contaplus               | Chift / Nubyhub (middleware) o exportación periódica de ficheros |
| A3 ASESOR clásico / a3nom desktop | Middleware Chift o exportación XML/Excel                         |

---

## 2. Arquitectura de la capa ERP

### 2.1 Principio de diseño

El `provider` de `ExternalConnection` ya distingue las conexiones (`'holded'`, `'chatgpt'`, `'claude'`…). Se extiende sin campo nuevo usando:

```
provider = 'holded' | 'sage_200c' | 'a3innuva'
```

`credentialType` se usa para distinguir `api_key` (Holded) de `oauth` (Sage, A3).

### 2.2 Interfaz ErpClient

Nuevo fichero: `apps/isaak/app/lib/erp-client.ts`

```typescript
export interface ErpInvoice {
  id: string;
  number: string;
  date: string; // ISO 8601
  dueDate?: string;
  contactId: string;
  contactName: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  type: 'invoice' | 'purchase' | 'creditnote' | 'estimate';
  lines: ErpInvoiceLine[];
}

export interface ErpInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export interface ErpContact {
  id: string;
  name: string;
  nif?: string;
  email?: string;
  phone?: string;
  type: 'client' | 'supplier' | 'both';
  balance?: number; // saldo pendiente
}

export interface ErpProduct {
  id: string;
  name: string;
  sku?: string;
  price: number;
  stock?: number;
  taxRate?: number;
}

export interface ErpAccountEntry {
  id: string;
  date: string;
  description: string;
  account: string; // código contable
  debit: number;
  credit: number;
}

export interface ErpSnapshot {
  invoices: ErpInvoice[];
  contacts: ErpContact[];
  products?: ErpProduct[];
  entries?: ErpAccountEntry[];
  period: { from: string; to: string };
  fetchedAt: string;
}

export interface ErpClient {
  readonly provider: 'holded' | 'sage_200c' | 'a3innuva';

  listInvoices(params: {
    type?: ErpInvoice['type'];
    from?: string;
    to?: string;
    contactId?: string;
    limit?: number;
  }): Promise<ErpInvoice[]>;

  getInvoice(id: string, type: ErpInvoice['type']): Promise<ErpInvoice>;

  listContacts(params?: { type?: ErpContact['type']; limit?: number }): Promise<ErpContact[]>;

  listProducts(params?: { limit?: number }): Promise<ErpProduct[]>;

  listAccountEntries(params?: {
    from?: string;
    to?: string;
    account?: string;
  }): Promise<ErpAccountEntry[]>;

  getSnapshot(params?: { from?: string; to?: string }): Promise<ErpSnapshot>;
}
```

### 2.3 Adapters

| Fichero                | Fuente datos                              | Auth                                |
| ---------------------- | ----------------------------------------- | ----------------------------------- |
| `holded-erp-client.ts` | Funciones existentes `holded-api.ts`      | `apiKeyEnc` → desencripta           |
| `sage-erp-client.ts`   | REST OData v4 `developer.sage.com/200c`   | OAuth access_token                  |
| `a3-erp-client.ts`     | REST JSON `a3developers.wolterskluwer.es` | OAuth + `Ocp-Apim-Subscription-Key` |

### 2.4 Factory

```typescript
// apps/isaak/app/lib/erp-client-factory.ts
export async function getErpClient(tenantId: string): Promise<ErpClient> {
  const conn = await getActiveErpConnection(tenantId);
  if (!conn) throw new Error('No ERP connection');

  switch (conn.provider) {
    case 'holded':
      return new HoldedErpClient(conn);
    case 'sage_200c':
      return new SageErpClient(conn, await getOAuthToken(conn));
    case 'a3innuva':
      return new A3ErpClient(conn, await getOAuthToken(conn));
    default:
      throw new Error(`Unknown ERP provider: ${conn.provider}`);
  }
}
```

El chat Isaak (`/api/holded/chat`) pasa de llamar directamente a `holded-api.ts` a llamar a `getErpClient(tenantId)`. Los tools de Claude quedan inalterados en semántica; el mapping interno cambia.

---

## 3. Gestión de tokens OAuth (Sage + A3)

### 3.1 Nuevo modelo Prisma

```prisma
model ErpOAuthToken {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  connectionId String   @unique @map("connection_id") @db.Uuid
  tenantId     String   @map("tenant_id") @db.Uuid
  provider     String   // 'sage_200c' | 'a3innuva'
  accessTokenEnc  String  @map("access_token_enc")   // AES-256-GCM
  refreshTokenEnc String? @map("refresh_token_enc")  // AES-256-GCM
  expiresAt    DateTime @map("expires_at") @db.Timestamptz
  scope        String   @default("")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz

  connection   ExternalConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  tenant       Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("erp_oauth_tokens")
}
```

Mismo patrón de cifrado AES-256-GCM que `TenantCertificate`. Clave `ERP_TOKEN_MASTER_KEY` (o reutilizar `CERT_MASTER_KEY` con contexto diferente de derivación).

### 3.2 Auto-refresh

```typescript
async function getOAuthToken(conn: ExternalConnection): Promise<string> {
  const row = await prisma.erpOAuthToken.findUnique({ where: { connectionId: conn.id } });
  if (!row) throw new Error('No OAuth token stored');

  if (row.expiresAt > addMinutes(new Date(), 5)) {
    return decryptToken(row.accessTokenEnc);
  }

  // Refresh
  const refreshed = await refreshOAuthToken(conn.provider, decryptToken(row.refreshTokenEnc!));
  await prisma.erpOAuthToken.update({
    where: { connectionId: conn.id },
    data: {
      accessTokenEnc: encryptToken(refreshed.access_token),
      expiresAt: addSeconds(new Date(), refreshed.expires_in),
    },
  });
  return refreshed.access_token;
}
```

---

## 4. Flujo de conexión por ERP

### 4.1 Sage 200c

```
Usuario → Settings → "Conectar Sage 200c"
  → GET /api/isaak/erp/sage/connect
  → Redirect OAuth Sage (scope: invoices.read contacts.read accounting.read)
  → Callback /api/isaak/erp/sage/callback
  → Guarda ExternalConnection (provider='sage_200c', credentialType='oauth')
  → Guarda ErpOAuthToken cifrado
  → Redirige a /resumen?erp=sage_200c
```

Variables de entorno:

```
SAGE_CLIENT_ID=
SAGE_CLIENT_SECRET=
SAGE_OAUTH_BASE=https://id.sage.com
SAGE_API_BASE=https://api.sage.com/200c
```

### 4.2 a3innuva

```
Usuario → Settings → "Conectar a3innuva"
  → GET /api/isaak/erp/a3/connect
  → Redirect OAuth Wolters Kluwer (scope: openid invoicing.read accounting.read)
  → Callback /api/isaak/erp/a3/callback
  → Guarda ExternalConnection (provider='a3innuva', credentialType='oauth')
  → Guarda ErpOAuthToken + header Ocp-Apim-Subscription-Key (cifrado en apiKeyEnc)
  → Redirige a /resumen?erp=a3innuva
```

Variables de entorno:

```
A3_CLIENT_ID=
A3_CLIENT_SECRET=
A3_SUBSCRIPTION_KEY=
A3_OAUTH_BASE=https://identity.a3developers.wolterskluwer.es
A3_API_BASE=https://api.a3developers.wolterskluwer.es/v1
```

---

## 5. Mapping de datos

### 5.1 Facturas

| Campo `ErpInvoice` | Holded           | Sage 200c OData   | a3innuva REST  |
| ------------------ | ---------------- | ----------------- | -------------- |
| `id`               | `_id`            | `$id`             | `id`           |
| `number`           | `docNumber`      | `document_number` | `number`       |
| `date`             | `date` (unix)    | `date`            | `date`         |
| `dueDate`          | `dueDate` (unix) | `due_date`        | `due_date`     |
| `contactName`      | `contact.name`   | `customer.name`   | `contact.name` |
| `total`            | `total`          | `total_amount`    | `total`        |
| `status`           | `status` string  | `status` enum     | `status` enum  |

### 5.2 Contactos

| Campo `ErpContact` | Holded      | Sage 200c                              | a3innuva |
| ------------------ | ----------- | -------------------------------------- | -------- |
| `id`               | `_id`       | `$id`                                  | `id`     |
| `name`             | `name`      | `name`                                 | `name`   |
| `nif`              | `vatnumber` | `tax_number`                           | `tax_id` |
| `type`             | `type` enum | deducir de `is_customer`/`is_supplier` | `type`   |

---

## 6. Plan de sprints

### Sprint P3-4-A (2 semanas) — Abstracción + Sage 200c

**Objetivo:** Sage 200c funcionando en producción. Holded migrado a la capa genérica.

| Tarea                                                  | Ficheros                           | Esfuerzo |
| ------------------------------------------------------ | ---------------------------------- | -------- |
| Crear `erp-client.ts` con interfaz + tipos             | `app/lib/erp-client.ts`            | S        |
| Crear `holded-erp-client.ts` wrapeando `holded-api.ts` | `app/lib/holded-erp-client.ts`     | S        |
| Migrar `/api/holded/chat` a `getErpClient()`           | `app/api/holded/chat/route.ts`     | M        |
| Migrar `/resumen` dashboard a `getErpClient()`         | `app/(workspace)/resumen/`         | M        |
| Migración Prisma `ErpOAuthToken`                       | `packages/db/prisma/schema.prisma` | S        |
| OAuth flow Sage: connect + callback                    | `app/api/isaak/erp/sage/`          | M        |
| `sage-erp-client.ts` con auto-refresh                  | `app/lib/sage-erp-client.ts`       | M        |
| UI Settings: card "Conectar Sage 200c"                 | `app/(workspace)/settings/`        | S        |
| Tests smoke: listar facturas + contactos Sage          | scripts/sage-smoke.mjs             | S        |

### Sprint P3-4-B (2 semanas) — a3innuva

**Objetivo:** a3innuva funcionando. Add-on €15/mes/ERP en billing.

| Tarea                                               | Ficheros                    | Esfuerzo |
| --------------------------------------------------- | --------------------------- | -------- |
| OAuth flow A3: connect + callback                   | `app/api/isaak/erp/a3/`     | M        |
| `a3-erp-client.ts` con APIM subscription key        | `app/lib/a3-erp-client.ts`  | M        |
| Sage/A3 tools en HOLDED_CHAT_TOOLS → ERP_CHAT_TOOLS | `app/lib/erp-tools.ts`      | M        |
| UI Settings: card "Conectar a3innuva"               | `app/(workspace)/settings/` | S        |
| Stripe add-on €15/mes/ERP: price + webhook          | `app/api/isaak/billing/`    | M        |
| Dashboard `/resumen` multi-ERP (selector si >1 ERP) | `app/(workspace)/resumen/`  | S        |
| Tests smoke a3innuva                                | scripts/a3-smoke.mjs        | S        |

### Sprint P3-4-C (1 semana) — Middleware legacy (opcional)

**Objetivo:** Soporte básico Sage 50 / A3 desktop via Chift o Nubyhub.

| Tarea                    | Detalle                 | Esfuerzo |
| ------------------------ | ----------------------- | -------- |
| Evaluar Chift vs Nubyhub | Precio, cobertura, GDPR | XS       |
| `chift-erp-client.ts`    | Si se decide integrar   | L        |
| UI onboarding Chift      | Redirect a Chift setup  | M        |

**Decisión:** Solo avanzar el Sprint C si hay demanda confirmada de clientes con ERP desktop.

---

## 7. Impacto en chat Isaak

Los tools de Anthropic (`HOLDED_CHAT_TOOLS`) se renombran a `ERP_CHAT_TOOLS` y pasan a ser agnósticos. El nombre de los tools en el prompt sigue siendo `holded_list_documents` etc. durante la transición para no romper el sistema prompt actual; en una segunda iteración se normalizan a `erp_list_invoices`.

El system prompt recibe un bloque nuevo:

```
ERP conectado: Sage 200c
Empresa: Talleres López S.L.
```

sustituyendo el bloque Holded existente cuando el ERP activo no es Holded.

---

## 8. Seguridad

| Control                   | Implementación                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| Tokens OAuth cifrados     | AES-256-GCM, misma clave derivada que certificados                                                |
| `ERP_TOKEN_MASTER_KEY`    | Solo en Vercel env vars, nunca en código                                                          |
| Refresh automático        | Solo si `expiresAt < now + 5min`; retry con backoff                                               |
| Revocación al desconectar | `DELETE /api/isaak/erp/:provider/disconnect` revoca token en el proveedor + borra `ErpOAuthToken` |
| IDOR check                | `connectionId` siempre validado contra `tenantId` del session cookie                              |
| Scope mínimo              | Solo `read` scopes; sin `write` hasta que se implemente escritura con confirmación                |

---

## 9. Plan de pricing / billing

El add-on ya está definido en `ISAAK_SUBSCRIPTION_MODEL.md`:

```
ERP adicional (Sage, A3…) — €15/mes/ERP
```

Implementación Stripe:

- Nuevo Price `price_erp_addon_monthly` (€15, tipo `metered` o `per_unit`)
- Webhook `customer.subscription.updated` → actualizar `ExternalConnection.addOnActive`
- UI: Settings muestra "Add-on ERP activo" o CTA para activarlo

---

## 10. Criterios de done por sprint

### P3-4-A done when:

- [ ] Un tenant puede conectar Sage 200c desde Settings
- [ ] El chat Isaak responde preguntas de facturas y contactos con datos reales de Sage
- [ ] El dashboard `/resumen` carga KPIs desde Sage
- [ ] Holded sigue funcionando igual (no hay regresión)
- [ ] Smoke test pasa en CI

### P3-4-B done when:

- [ ] Un tenant puede conectar a3innuva desde Settings
- [ ] El chat funciona con datos a3innuva
- [ ] Add-on €15/mes/ERP activable desde la UI
- [ ] Multi-ERP: si hay Holded + Sage, el usuario puede seleccionar cuál usa el chat

---

## 11. Riesgos y mitigaciones

| Riesgo                                        | Probabilidad | Mitigación                                                                                          |
| --------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| Sage cambia endpoints OData entre versiones   | Media        | Pinear versión en URL (`/v3/`) y mantener contrato en `sage-erp-client.ts`                          |
| a3innuva APIM subscription key de pago        | Alta         | Registrarse en portal y verificar tiers antes de codificar                                          |
| Pocos clientes en SaaS (mayoría en desktop)   | Alta para A3 | Priorizar Sage 200c primero; A3 desktop via middleware si hay demanda                               |
| OAuth Sage requiere aprobación de integración | Media        | Iniciar proceso de partner registration en `developer.sage.com` en paralelo al desarrollo           |
| Mapping de campos incompleto                  | Media        | Construir sobre casos reales; el `ErpSnapshot` es "best effort" — campos opcionales son `undefined` |

---

## 12. Siguientes pasos inmediatos

1. **Registrarse en portal Sage developer** → `developer.sage.com/200c` → crear app, obtener `client_id` + `client_secret`
2. **Registrarse en portal A3** → `a3developers.wolterskluwer.es` → crear app, obtener `client_id` + `subscription_key`
3. **Confirmar tiers gratuitos** de ambos portales (¿hay fee mensual por ser partner?)
4. **Iniciar P3-4-A** con la abstracción `erp-client.ts` + migración Holded, sin esperar las credenciales OAuth

El trabajo de abstracción (P3-4-A semana 1) es independiente de las credenciales; el flujo OAuth completo necesita las credenciales activas para testear.
