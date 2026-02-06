# eInforma - ficha de empresa (mapeo)

## Response normalizado (API interna)

```ts
normalized: {
  (name,
    nif,
    sourceId,
    cnae,
    cnaeCode,
    cnaeText,
    legalForm,
    status,
    incorporationDate,
    address,
    postalCode,
    city,
    province,
    country,
    website,
    capitalSocial);
}
```

## Campos operativos -> TenantProfile

- **legalName / name**
  - si `normalized.legalName` existe -> usar como nombre fiscal
  - si no -> `normalized.name`
- **taxId / nif** -> `normalized.nif`
- **website** -> `normalized.website`
- **legalForm** -> `normalized.legalForm`
- **status** -> `normalized.status`
- **incorporationDate** -> `normalized.incorporationDate`
- **capitalSocial** -> `normalized.capitalSocial`

### CNAE

- `cnaeCode` = parte izquierda (ej. `8532`)
- `cnaeText` = parte derecha (ej. `Educacion secundaria tecnica y profesional`)

### Direccion

- `address` = `normalized.address`
- `postalCode` = `normalized.postalCode`
- `city` = `normalized.city`
- `province` = `normalized.province`
- `country` = `normalized.country`

### Metadatos

- `einformaSourceId` = `normalized.sourceId`
- `einformaLastSyncAt` = now()
- `einformaTaxIdVerified` = true
- `einformaRaw` = snapshot completo (JSON)

## Normalizacion recomendada (city + postalCode)

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

## Snapshot maximo valor (sin gastar llamadas extra)

- Guardar el `raw` completo (`einformaRaw`).
- Renderizar tabs extra (BORME/cuentas/representantes) solo si existen en `raw`.
- Si luego hay endpoints premium, anadir boton **Actualizar** con aviso de coste.

## UI recomendada (para ahorrar creditos)

- **Busqueda**: solo por nombre/CIF con resultados minimos.
- **Detalle**: llamar `/company` solo al seleccionar un resultado.
- **Guardar**: persistir en TenantProfile + snapshot.
- **Admin**: mostrar badge Snapshot/Live y boton **Actualizar** (refresh=1).
