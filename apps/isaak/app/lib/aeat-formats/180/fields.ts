// Modelo 180 — Diseño de registro AEAT (Orden HAC, ejercicio 2023).
//
// Fuente: DR_Mod_180_2023.pdf (AEAT, BOE).
// Codificado MANUALMENTE desde el PDF — OCA/l10n-spain no incluye este
// módulo, así que no hay ground truth open-source.
//
// Estructura:
//   * Registro tipo 1 (declarante) — 500 bytes
//   * N x Registro tipo 2 (perceptor) — 500 bytes cada uno
//
// Reglas de relleno (PDF página 6):
//   * Todos los importes son positivos (signo en campo separado si N)
//   * Numéricos sin contenido → ceros, alineación derecha
//   * Alfanuméricos sin contenido → blancos, alineación izquierda
//   * Mayúsculas, sin acentos, sin caracteres especiales

import type { FieldSpec } from '../format-engine';

// ─── Registro tipo 1: declarante (500 bytes) ──────────────────────────

export const SPEC_180_TIPO1: ReadonlyArray<FieldSpec> = [
  // 1: Tipo registro = "1"
  {
    name: 'tipoRegistro',
    description: 'Tipo de registro (constante "1")',
    size: 1,
    alignment: 'left',
    applySign: false,
    type: 'string',
    fixedValue: '1',
  },
  // 2-4: Modelo = "180"
  {
    name: 'modelo',
    description: 'Modelo declaración (constante "180")',
    size: 3,
    alignment: 'left',
    applySign: false,
    type: 'string',
    fixedValue: '180',
  },
  // 5-8: Ejercicio (4 cifras)
  {
    name: 'ejercicio',
    description: 'Ejercicio fiscal (4 dígitos)',
    size: 4,
    alignment: 'right',
    applySign: false,
    type: 'string',
    padChar: '0',
  },
  // 9-17: NIF declarante (9 chars, ajustado derecha rellenando con ceros izda)
  {
    name: 'nifDeclarante',
    description: 'NIF del declarante (9 chars)',
    size: 9,
    alignment: 'right',
    applySign: false,
    type: 'string',
    padChar: '0',
  },
  // 18-57: Apellidos y nombre o razón social (40 chars, izda + blancos dcha)
  {
    name: 'nombreDeclarante',
    description: 'Apellidos y nombre o razón social del declarante',
    size: 40,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 58: Tipo soporte (alfabético: 'T' telemático)
  {
    name: 'tipoSoporte',
    description: 'Tipo soporte (constante "T" telemático)',
    size: 1,
    alignment: 'left',
    applySign: false,
    type: 'string',
    fixedValue: 'T',
  },
  // 59-67: Teléfono persona contacto (9 chars numéricos)
  {
    name: 'telefonoContacto',
    description: 'Teléfono persona contacto',
    size: 9,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 68-107: Apellidos y nombre persona contacto (40 chars)
  {
    name: 'nombreContacto',
    description: 'Apellidos y nombre persona contacto',
    size: 40,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 108-120: Número identificativo declaración (13 chars, empieza por '180')
  {
    name: 'numeroDeclaracion',
    description: 'Nº identificativo declaración (13 chars, prefijo 180)',
    size: 13,
    alignment: 'right',
    applySign: false,
    type: 'string',
    padChar: '0',
  },
  // 121: Declaración complementaria ('C' o blanco)
  {
    name: 'declaracionComplementaria',
    description: 'Declaración complementaria ("C" o blanco)',
    size: 1,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 122: Declaración sustitutiva ('S' o blanco)
  {
    name: 'declaracionSustitutiva',
    description: 'Declaración sustitutiva ("S" o blanco)',
    size: 1,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 123-135: Nº identificativo declaración anterior (13 chars, ceros si no aplica)
  {
    name: 'numeroDeclaracionAnterior',
    description: 'Nº identificativo declaración anterior',
    size: 13,
    alignment: 'right',
    applySign: false,
    type: 'string',
    padChar: '0',
  },
  // 136-144: Nº total perceptores (9 chars numéricos)
  {
    name: 'totalPerceptores',
    description: 'Número total de perceptores',
    size: 9,
    alignment: 'right',
    applySign: false,
    type: 'integer',
  },
  // 145: Signo base retenciones ('N' o blanco)
  {
    name: 'signoBase',
    description: 'Signo base retenciones ("N" si negativo, blanco si positivo)',
    size: 1,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 146-160: Importe total bases retenciones (15 chars: 13 enteros + 2 decimales)
  {
    name: 'importeTotalBases',
    description: 'Importe total bases retenciones (céntimos)',
    size: 15,
    decimalSize: 2,
    alignment: 'right',
    applySign: false,
    type: 'float',
  },
  // 161-175: Retenciones e ingresos a cuenta (15 chars: 13 enteros + 2 decimales)
  {
    name: 'totalRetenciones',
    description: 'Total retenciones e ingresos a cuenta (céntimos)',
    size: 15,
    decimalSize: 2,
    alignment: 'right',
    applySign: false,
    type: 'float',
  },
  // 176-237: Blancos (62 chars)
  {
    name: 'reservado1',
    description: 'Reservado (blancos)',
    size: 62,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 238-500: Sello electrónico (263 chars, blancos en colectivas)
  {
    name: 'selloElectronico',
    description: 'Sello electrónico (blancos para presentaciones colectivas)',
    size: 263,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
];

// ─── Registro tipo 2: perceptor (500 bytes) ───────────────────────────

export const SPEC_180_TIPO2: ReadonlyArray<FieldSpec> = [
  // 1: Tipo registro = "2"
  {
    name: 'tipoRegistro',
    description: 'Tipo de registro (constante "2")',
    size: 1,
    alignment: 'left',
    applySign: false,
    type: 'string',
    fixedValue: '2',
  },
  // 2-4: Modelo = "180"
  {
    name: 'modelo',
    description: 'Modelo declaración (constante "180")',
    size: 3,
    alignment: 'left',
    applySign: false,
    type: 'string',
    fixedValue: '180',
  },
  // 5-8: Ejercicio
  {
    name: 'ejercicio',
    description: 'Ejercicio (consignar lo del tipo 1)',
    size: 4,
    alignment: 'right',
    applySign: false,
    type: 'string',
    padChar: '0',
  },
  // 9-17: NIF declarante
  {
    name: 'nifDeclarante',
    description: 'NIF del declarante (consignar lo del tipo 1)',
    size: 9,
    alignment: 'right',
    applySign: false,
    type: 'string',
    padChar: '0',
  },
  // 18-26: NIF perceptor (arrendador) — 9 chars, derecha + ceros izda
  {
    name: 'nifPerceptor',
    description: 'NIF del perceptor (arrendador)',
    size: 9,
    alignment: 'right',
    applySign: false,
    type: 'string',
    padChar: '0',
  },
  // 27-35: NIF representante legal (9 chars, blancos si no aplica)
  {
    name: 'nifRepresentante',
    description: 'NIF representante legal (blancos si no aplica)',
    size: 9,
    alignment: 'right',
    applySign: false,
    type: 'string',
  },
  // 36-75: Apellidos/nombre razón social perceptor (40 chars)
  {
    name: 'nombrePerceptor',
    description: 'Apellidos y nombre o razón social del perceptor',
    size: 40,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 76-77: Código provincia (2 chars numéricos)
  {
    name: 'codigoProvincia',
    description: 'Código provincia perceptor (2 dígitos)',
    size: 2,
    alignment: 'right',
    applySign: false,
    type: 'string',
    padChar: '0',
  },
  // 78: Modalidad ("1" dinerario, "2" especie)
  {
    name: 'modalidad',
    description: 'Modalidad ("1" dinerario, "2" especie)',
    size: 1,
    alignment: 'left',
    applySign: false,
    type: 'string',
    fixedValue: '1',
  },
  // 79: Signo base ("N" o blanco)
  {
    name: 'signoBase',
    description: 'Signo base retenciones',
    size: 1,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 80-92: Importe base retenciones (13 chars: 11 enteros + 2 decimales)
  {
    name: 'baseRetenciones',
    description: 'Base retenciones e ingresos a cuenta (céntimos)',
    size: 13,
    decimalSize: 2,
    alignment: 'right',
    applySign: false,
    type: 'float',
  },
  // 93-94: % retención parte entera (2 chars)
  {
    name: 'porcentajeEntero',
    description: '% retención parte entera (2 dígitos)',
    size: 2,
    alignment: 'right',
    applySign: false,
    type: 'integer',
  },
  // 95-96: % retención parte decimal (2 chars)
  {
    name: 'porcentajeDecimal',
    description: '% retención parte decimal (2 dígitos)',
    size: 2,
    alignment: 'right',
    applySign: false,
    type: 'integer',
  },
  // 97-109: Retenciones e ingresos a cuenta (13 chars: 11 + 2 decimales)
  {
    name: 'retencionPerceptor',
    description: 'Retenciones e ingresos a cuenta del perceptor',
    size: 13,
    decimalSize: 2,
    alignment: 'right',
    applySign: false,
    type: 'float',
  },
  // 110-113: Ejercicio devengo (4 chars, ceros si no aplica)
  {
    name: 'ejercicioDevengo',
    description: 'Ejercicio de devengo (ceros si no aplica)',
    size: 4,
    alignment: 'right',
    applySign: false,
    type: 'integer',
  },
  // 114: Situación inmueble (1-4)
  {
    name: 'situacionInmueble',
    description: 'Situación inmueble (1-4)',
    size: 1,
    alignment: 'left',
    applySign: false,
    type: 'string',
    fixedValue: '4', // sin referencia catastral por defecto
  },
  // 115-134: Referencia catastral (20 chars alfanuméricos)
  {
    name: 'referenciaCatastral',
    description: 'Referencia catastral del inmueble',
    size: 20,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 135-139: Tipo vía (5 chars)
  {
    name: 'tipoVia',
    description: 'Tipo vía (código INE, 5 chars)',
    size: 5,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 140-189: Nombre vía (50 chars)
  {
    name: 'nombreVia',
    description: 'Nombre vía pública',
    size: 50,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 190-192: Tipo numeración (3 chars)
  {
    name: 'tipoNumeracion',
    description: 'Tipo numeración (NÚM, KM., S/N)',
    size: 3,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 193-197: Número casa (5 chars)
  {
    name: 'numeroCasa',
    description: 'Número casa o punto kilométrico',
    size: 5,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 198-200: Calificador número (3 chars)
  {
    name: 'calificadorNumero',
    description: 'Calificador del número (BIS, DUP, etc.)',
    size: 3,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 201-203: Bloque (3 chars)
  {
    name: 'bloque',
    description: 'Bloque',
    size: 3,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 204-206: Portal (3 chars)
  {
    name: 'portal',
    description: 'Portal',
    size: 3,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 207-209: Escalera (3 chars)
  {
    name: 'escalera',
    description: 'Escalera',
    size: 3,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 210-212: Planta (3 chars)
  {
    name: 'planta',
    description: 'Planta o piso',
    size: 3,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 213-215: Puerta (3 chars)
  {
    name: 'puerta',
    description: 'Puerta',
    size: 3,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 216-255: Complemento (40 chars)
  {
    name: 'complemento',
    description: 'Complemento domicilio',
    size: 40,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 256-285: Localidad (30 chars)
  {
    name: 'localidad',
    description: 'Localidad o población (si distinta del municipio)',
    size: 30,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 286-315: Municipio (30 chars)
  {
    name: 'municipio',
    description: 'Nombre del municipio',
    size: 30,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
  // 316-320: Código municipio INE (5 chars)
  {
    name: 'codigoMunicipio',
    description: 'Código municipio normalizado INE',
    size: 5,
    alignment: 'right',
    applySign: false,
    type: 'string',
    padChar: '0',
  },
  // 321-322: Código provincia inmueble (2 chars)
  {
    name: 'codigoProvinciaInmueble',
    description: 'Código provincia del inmueble',
    size: 2,
    alignment: 'right',
    applySign: false,
    type: 'string',
    padChar: '0',
  },
  // 323-327: Código postal (5 chars)
  {
    name: 'codigoPostal',
    description: 'Código postal del inmueble',
    size: 5,
    alignment: 'right',
    applySign: false,
    type: 'string',
    padChar: '0',
  },
  // 328-500: Blancos (173 chars)
  {
    name: 'reservadoFinal',
    description: 'Reservado (blancos)',
    size: 173,
    alignment: 'left',
    applySign: false,
    type: 'string',
  },
];
