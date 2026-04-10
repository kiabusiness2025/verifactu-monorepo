export type MigrationServiceId =
  | 'migracion_holded_express'
  | 'migracion_holded_growth'
  | 'migracion_holded_enterprise';

export type MigrationService = {
  id: MigrationServiceId;
  name: string;
  subtitle: string;
  priceFromEur: number;
  outcome: string;
  includes: string[];
};

export const MIGRATION_SERVICES: MigrationService[] = [
  {
    id: 'migracion_holded_express',
    name: 'Migracion Holded Express',
    subtitle: 'Para autonomos y equipos pequenos que quieren salir rapido a produccion.',
    priceFromEur: 490,
    outcome: 'Base operativa limpia en Holded con datos esenciales y validacion inicial.',
    includes: [
      'Auditoria rapida de origen y checklist de migracion.',
      'Migracion de clientes, proveedores y catalogo base.',
      'Configuracion inicial fiscal y contable en Holded.',
      'Revision final con informe de consistencia.',
    ],
  },
  {
    id: 'migracion_holded_growth',
    name: 'Migracion Holded Growth',
    subtitle: 'Para empresas en crecimiento que necesitan orden, trazabilidad y acompanamiento.',
    priceFromEur: 1200,
    outcome: 'Migracion operativa completa con criterios de calidad y handoff al equipo.',
    includes: [
      'Mapeo de datos origen-destino con reglas de normalizacion.',
      'Migracion de historico relevante para operativa diaria.',
      'Parametrizacion avanzada de impuestos, series y estructura.',
      'Sesion de traspaso y playbook de operacion post-migracion.',
    ],
  },
  {
    id: 'migracion_holded_enterprise',
    name: 'Migracion Holded Enterprise',
    subtitle: 'Para operaciones complejas con multiples flujos y dependencias internas.',
    priceFromEur: 2400,
    outcome: 'Proyecto de migracion integral con plan por fases y control de riesgos.',
    includes: [
      'Diagnostico profundo de procesos y dependencias.',
      'Plan de migracion por olas y validaciones por bloque.',
      'Soporte de arranque intensivo durante la salida.',
      'Comite de cierre con metricas, incidencias y siguientes pasos.',
    ],
  },
];

export function getMigrationCheckoutHref(serviceId: MigrationServiceId) {
  return `/api/checkout?service=${serviceId}`;
}
