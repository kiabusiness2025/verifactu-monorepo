// F13 Inspector AEAT Capa 3 — Source registry.
//
// Lista declarativa de las fuentes de normativa y doctrina fiscal que
// alimentan el corpus RAG. Cada source es ingestable de forma
// independiente; el pipeline (F13 fase 2) recorre este registry,
// descarga la última versión, la chunkifica, embede y persiste.
//
// Política: las URLs apuntan a la versión vigente publicada por
// AEAT/BOE. La fecha real de la versión se captura en `ingestedAt` en
// el momento de ingesta, no aquí (este registry es estable).

export type AeatSourceType =
  | 'manual_aeat'  // Manuales prácticos publicados por AEAT (IRPF, IVA, etc.)
  | 'boe'          // Textos refundidos del BOE (LIVA, LIRPF, LIS, LGT, RDs)
  | 'informa'      // Base INFORMA de consultas vinculantes DGT
  | 'sede_faq'     // FAQs sede electrónica AEAT (modelos, formularios)
  | 'doctrina_dgt';// Consultas vinculantes y resoluciones DGT/TEAR

export type AeatSource = {
  id: string;          // sourceId estable (snake_case con año si aplica)
  type: AeatSourceType;
  name: string;        // user-facing label
  url: string;         // URL canónica
  fetcher: 'pdf' | 'html' | 'sitemap' | 'api';
  // Tags arbitrarias que sirven al filtro de búsqueda (e.g. 'iva',
  // 'irpf', 'autonomo'). Ningún cliente las consume al chunkear; las
  // chunks heredan los tags al ingestarse.
  tags: ReadonlyArray<string>;
};

// IMPORTANT: ids son CONTRATO público (los chunks los referencian). No
// renombrar ids existentes; añadir uno nuevo con sufijo de versión si
// la fuente cambia estructura (p.ej. 'manual_irpf_2027').

export const AEAT_SOURCES: ReadonlyArray<AeatSource> = [
  // Manuales prácticos AEAT
  {
    id: 'manual_irpf_2026',
    type: 'manual_aeat',
    name: 'Manual práctico IRPF — ejercicio 2025 (edición 2026)',
    url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-renta-2025.html',
    fetcher: 'pdf',
    tags: ['irpf', 'renta', 'autonomo', 'persona_fisica'],
  },
  {
    id: 'manual_iva_2026',
    type: 'manual_aeat',
    name: 'Manual práctico IVA — edición 2026',
    url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2026.html',
    fetcher: 'pdf',
    tags: ['iva', 'autonomo', 'sociedad'],
  },
  {
    id: 'manual_sociedades_2026',
    type: 'manual_aeat',
    name: 'Manual práctico Sociedades — ejercicio 2025',
    url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-sociedades-2025.html',
    fetcher: 'pdf',
    tags: ['is', 'sociedad', 'sl', 'sa'],
  },

  // BOE textos refundidos
  {
    id: 'boe_liva',
    type: 'boe',
    name: 'Ley 37/1992 del Impuesto sobre el Valor Añadido (LIVA) — consolidada',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740',
    fetcher: 'html',
    tags: ['iva', 'liva', 'normativa'],
  },
  {
    id: 'boe_lirpf',
    type: 'boe',
    name: 'Ley 35/2006 del IRPF (LIRPF) — consolidada',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764',
    fetcher: 'html',
    tags: ['irpf', 'lirpf', 'normativa'],
  },
  {
    id: 'boe_lis',
    type: 'boe',
    name: 'Ley 27/2014 del Impuesto sobre Sociedades (LIS) — consolidada',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328',
    fetcher: 'html',
    tags: ['is', 'lis', 'normativa', 'sociedades'],
  },
  {
    id: 'boe_lgt',
    type: 'boe',
    name: 'Ley 58/2003 General Tributaria (LGT) — consolidada',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186',
    fetcher: 'html',
    tags: ['lgt', 'general', 'procedimiento', 'normativa'],
  },
  {
    id: 'boe_rd_facturacion',
    type: 'boe',
    name: 'RD 1619/2012 Reglamento de Facturación — consolidado',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696',
    fetcher: 'html',
    tags: ['facturacion', 'normativa'],
  },
  {
    id: 'boe_rd_verifactu',
    type: 'boe',
    name: 'RD 1007/2023 — sistemas informáticos VERI*FACTU',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840',
    fetcher: 'html',
    tags: ['verifactu', 'facturacion_electronica', 'normativa'],
  },

  // INFORMA — base de criterios DGT
  {
    id: 'informa_iva',
    type: 'informa',
    name: 'INFORMA — Criterios IVA (DGT)',
    url: 'https://sede.agenciatributaria.gob.es/Sede/iva.html',
    fetcher: 'sitemap',
    tags: ['informa', 'iva', 'doctrina', 'dgt'],
  },
  {
    id: 'informa_irpf',
    type: 'informa',
    name: 'INFORMA — Criterios IRPF (DGT)',
    url: 'https://sede.agenciatributaria.gob.es/Sede/irpf.html',
    fetcher: 'sitemap',
    tags: ['informa', 'irpf', 'doctrina', 'dgt'],
  },

  // Sede electrónica — FAQs por modelo
  {
    id: 'sede_faq_modelo_303',
    type: 'sede_faq',
    name: 'Sede AEAT — Modelo 303 (IVA trimestral)',
    url: 'https://sede.agenciatributaria.gob.es/Sede/iva/autoliquidacion-iva-modelo-303.html',
    fetcher: 'html',
    tags: ['modelo_303', 'iva'],
  },
  {
    id: 'sede_faq_modelo_130',
    type: 'sede_faq',
    name: 'Sede AEAT — Modelo 130 (IRPF fraccionado)',
    url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales/pagos-fraccionados.html',
    fetcher: 'html',
    tags: ['modelo_130', 'irpf', 'autonomo'],
  },
  {
    id: 'sede_faq_modelo_111',
    type: 'sede_faq',
    name: 'Sede AEAT — Modelo 111 (retenciones rendimientos trabajo)',
    url: 'https://sede.agenciatributaria.gob.es/Sede/retenciones-ingresos-cuenta-rentas-trabajo/modelo-111.html',
    fetcher: 'html',
    tags: ['modelo_111', 'retenciones', 'irpf'],
  },
];

export function findSourceById(id: string): AeatSource | undefined {
  return AEAT_SOURCES.find((s) => s.id === id);
}

export function listSourcesByType(type: AeatSourceType): AeatSource[] {
  return AEAT_SOURCES.filter((s) => s.type === type);
}
