# Modelo 303 — Diseño de Registro AEAT

## Fuente

Este directorio contiene el diseño de registro oficial AEAT para el
modelo 303 (versión 2024-10, vigente desde septiembre 2024).

El CSV `2024-10-fields.csv` se mantiene tal cual desde el repositorio
[OCA/l10n-spain](https://github.com/OCA/l10n-spain/tree/15.0/l10n_es_aeat_mod303/data/2024-10)
(licencia AGPL/LGPL).

OCA es la Odoo Community Association, que mantiene los conectores
fiscales españoles como software libre y los actualiza puntualmente
cuando AEAT publica una nueva orden ministerial (Orden HFP/...).

## Estructura del fichero BOE

El fichero `.303` que acepta AEAT en "presentación por fichero" es:

- **Encoding**: ISO-8859-15 (Latin-9, 1 byte/char)
- **Sin separadores de línea entre registros**
- **Tamaño fijo total**: ~2597 bytes para una declaración completa
  - Sub01 (página 1, régimen general/simplificado): 1580 bytes, 88 campos
  - Sub03 (página 3, información adicional + resultado): 1017 bytes, 58 campos

## Versionado

Cuando AEAT publica una nueva orden, hay que:

1. Verificar el nuevo CSV en OCA (suelen actualizarlo en <1 mes)
2. Copiarlo a un nuevo directorio `YYYY-MM-fields.csv`
3. Actualizar el spec-parser para que apunte al CSV correcto según
   la fecha de la declaración

## Casillas → campos

El modelo 303 oficial tiene "casillas" numeradas (01, 02, 03, ..., 88,
108, 109, 150, 151, 152, ...). Cada casilla mapea a un campo del
fichero BOE en la posición correspondiente. La columna `name` del CSV
incluye el número de casilla entre corchetes (ej. `[150]`, `[01]`).

El mapeo casilla → expresión está en la columna `expression`.

## Disclaimer

Este código produce un fichero con la estructura correcta, pero **no
sustituye el validador oficial AEAT**. Antes de presentar en
producción:

1. Generar el fichero con este serializer
2. Subirlo al servicio "Presentación por fichero" en pre-producción
   AEAT
3. Confirmar que el validador no devuelve errores
4. Solo entonces enviar a producción

Las casillas calculadas por Isaak desde el Ledger son una estimación;
el contribuyente es responsable de revisar antes de presentar.
