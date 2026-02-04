# eInforma ? ficha de empresa (mapeo)

## Response normalizado (API interna)

```ts
company: {
  name,
  nif,
  cnae,
  legalForm,
  status,
  constitutionDate,
  address: { street, city, province, country },
  website,
  capitalSocial,
  sourceId
}
```

## Campos operativos ? TenantProfile

- **legalName / name**
  - si `company.legalName` existe ? usar como nombre fiscal
  - si no ? `company.name`
- **taxId / nif** ? `company.nif`
- **website** ? `company.website`
- **legalForm** ? `company.legalForm`
- **status** ? `company.status`
- **constitutionDate** ? `company.constitutionDate` (Date)
- **capitalSocial** ? `company.capitalSocial`

### CNAE

- `cnaeCode` = parte izquierda (ej. `8532`)
- `cnaeText` = parte derecha (ej. `Educaci�n secundaria t�cnica y profesional`)

### Direcci�n

- `street` = `address.street`
- `province` = `address.province`
- `country` = `address.country`
- `city` y `postalCode` se normalizan (ver abajo)

### Metadatos

- `einformaSourceId` = `company.sourceId`
- `einformaLastSyncAt` = now()
- `einformaTaxIdVerified` = true
- `einformaRaw` = snapshot completo (JSON)

## Normalizaci�n recomendada (city + postalCode)

Si `address.city` viene como:

```
"03110 MUTXAMEL (Alicante/Alacant)"
```

Normalizar a:

- `postalCode = "03110"`
- `city = "MUTXAMEL"`

Regex MVP:

```
^(\d{5})\s+([^()]+)(?:\s*\(.*\))?$
```

Si no hay match, dejar `postalCode` vac�o y limpiar `city` quitando lo que hay entre par�ntesis.

## Snapshot m�ximo valor (sin gastar llamadas extra)

- Guardar el `raw` completo (`einformaRaw`).
- Renderizar tabs extra (BORME/cuentas/representantes) solo si existen en `raw`.
- Si luego hay endpoints premium, a�adir bot�n **Actualizar** con aviso de coste.

## UI recomendada (para ahorrar cr�ditos)

- **B�squeda**: solo por nombre/CIF con resultados m�nimos.
- **Detalle**: llamar `/company` solo al seleccionar un resultado.
- **Guardar**: persistir en TenantProfile + snapshot.
