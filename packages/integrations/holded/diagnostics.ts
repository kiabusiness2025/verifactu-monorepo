type HoldedProbeEndpointStatus = {
  ok: boolean;
  status: number | null;
};

export type HoldedSupportedModule = 'invoicing' | 'accounting' | 'crm' | 'projects' | 'team';

export type HoldedProbeLike = {
  invoiceApi: HoldedProbeEndpointStatus;
  accountingApi: HoldedProbeEndpointStatus;
  crmApi: HoldedProbeEndpointStatus;
  projectsApi: HoldedProbeEndpointStatus;
  teamApi: HoldedProbeEndpointStatus;
};

export type HoldedProbeModuleDiagnostic = {
  key: HoldedSupportedModule;
  label: string;
  ok: boolean;
  status: number | null;
  detail: string;
  impact: string;
};

export type HoldedProbeSummary = {
  health: 'ready' | 'partial' | 'blocked';
  summary: string;
  nextStep: string;
  supportedModules: HoldedSupportedModule[];
  modules: HoldedProbeModuleDiagnostic[];
};

type ProbeEndpointKey = keyof HoldedProbeLike;

const MODULES: Array<{
  key: HoldedSupportedModule;
  endpoint: ProbeEndpointKey;
  label: string;
  success: string;
  impact: string;
}> = [
  {
    key: 'invoicing',
    endpoint: 'invoiceApi',
    label: 'Facturas y clientes',
    success: 'He podido entrar en ventas, facturas y clientes.',
    impact: 'Sin esta parte no podre revisar ventas, facturas, cobros ni clientes.',
  },
  {
    key: 'accounting',
    endpoint: 'accountingApi',
    label: 'Contabilidad',
    success: 'He podido entrar en contabilidad y plan de cuentas.',
    impact: 'Sin esta parte no podre revisar cuentas contables ni dar contexto contable fino.',
  },
  {
    key: 'crm',
    endpoint: 'crmApi',
    label: 'CRM',
    success: 'He podido entrar en la parte comercial.',
    impact: 'Sin esta parte no tendre visibilidad comercial adicional.',
  },
  {
    key: 'projects',
    endpoint: 'projectsApi',
    label: 'Proyectos',
    success: 'He podido entrar en proyectos.',
    impact: 'Sin esta parte no tendre detalle operativo de proyectos.',
  },
  {
    key: 'team',
    endpoint: 'teamApi',
    label: 'Equipo',
    success: 'He podido entrar en la parte de equipo.',
    impact: 'Sin esta parte no vere informacion del equipo.',
  },
];

function joinSpanishList(values: string[]) {
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} y ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} y ${values[values.length - 1]}`;
}

function normalizeSupportedModules(values: string[]) {
  const normalized = new Set<HoldedSupportedModule>();

  for (const value of values) {
    if (
      value === 'invoicing' ||
      value === 'accounting' ||
      value === 'crm' ||
      value === 'projects' ||
      value === 'team'
    ) {
      normalized.add(value);
    }
  }

  return Array.from(normalized);
}

function describeFailedStatus(label: string, status: number | null) {
  const normalizedLabel = label.toLowerCase();

  if (status === 401 || status === 403) {
    return `La API key no tiene permiso para ${normalizedLabel}.`;
  }

  if (status === 404) {
    return `Holded no ha expuesto ${normalizedLabel} para esta cuenta.`;
  }

  if (status === 429) {
    return `Holded ha limitado temporalmente el acceso a ${normalizedLabel}.`;
  }

  if (status === null) {
    return `Holded no ha respondido al comprobar ${normalizedLabel}.`;
  }

  return `Holded ha devuelto error ${status} al comprobar ${normalizedLabel}.`;
}

function buildModuleDiagnostics(probe: HoldedProbeLike) {
  return MODULES.map((module) => {
    const endpoint = probe[module.endpoint];

    return {
      key: module.key,
      label: module.label,
      ok: endpoint.ok,
      status: endpoint.status,
      detail: endpoint.ok ? module.success : describeFailedStatus(module.label, endpoint.status),
      impact: module.impact,
    } satisfies HoldedProbeModuleDiagnostic;
  });
}

export function pickSupportedModules(probe: HoldedProbeLike): HoldedSupportedModule[] {
  return buildModuleDiagnostics(probe)
    .filter((module) => module.ok)
    .map((module) => module.key);
}

export function buildHoldedProbeSummary(probe: HoldedProbeLike): HoldedProbeSummary {
  const modules = buildModuleDiagnostics(probe);
  const supportedModules = modules.filter((module) => module.ok).map((module) => module.key);
  const hasInvoicing = supportedModules.includes('invoicing');
  const hasAccounting = supportedModules.includes('accounting');

  let health: HoldedProbeSummary['health'];
  let summary: string;
  let nextStep: string;

  if (hasInvoicing && hasAccounting) {
    health = 'ready';
    summary = 'Conexion lista. Ya puedo leer ventas, facturas, clientes y contabilidad.';
    nextStep = 'Si quieres, sigo con un resumen real del negocio o con el detalle que necesites.';
  } else if (hasInvoicing && !hasAccounting) {
    health = 'partial';
    summary =
      'Conexion parcial. Ya puedo leer ventas, facturas y clientes, pero todavia no la parte contable.';
    nextStep =
      'Revisa en Holded que la API key tenga acceso a contabilidad si quieres contexto contable completo.';
  } else if (!hasInvoicing && hasAccounting) {
    health = 'partial';
    summary =
      'Conexion parcial. Ya puedo leer contabilidad, pero todavia no ventas, facturas y clientes.';
    nextStep =
      'Revisa que la API key tenga acceso a ventas y facturas si quieres un resumen comercial completo.';
  } else if (supportedModules.length > 0) {
    health = 'partial';
    summary = `Conexion parcial. He podido validar ${joinSpanishList(
      modules.filter((module) => module.ok).map((module) => module.label.toLowerCase())
    )}, pero aun no las areas principales de facturas o contabilidad.`;
    nextStep =
      'Mantengo la conexion viva, pero conviene revisar permisos de la API key antes de apoyarte en ella para el dia a dia.';
  } else {
    health = 'blocked';
    summary = 'No he podido validar la API key en ninguna de las areas que he comprobado.';
    nextStep =
      'Revisa que la API key siga activa en Holded y prueba con una clave nueva si hace falta.';
  }

  return {
    health,
    summary,
    nextStep,
    supportedModules,
    modules,
  };
}

export function buildStoredHoldedConnectionSummary(values: string[]) {
  const supportedModules = normalizeSupportedModules(values);
  const hasInvoicing = supportedModules.includes('invoicing');
  const hasAccounting = supportedModules.includes('accounting');

  if (hasInvoicing && hasAccounting) {
    return 'Conexion lista para ventas, facturas, clientes y contabilidad.';
  }

  if (hasInvoicing && !hasAccounting) {
    return 'Conexion parcial: ventas, facturas y clientes listos, pero falta la parte contable.';
  }

  if (!hasInvoicing && hasAccounting) {
    return 'Conexion parcial: contabilidad lista, pero faltan ventas, facturas y clientes.';
  }

  if (supportedModules.length > 0) {
    return `Conexion parcial. Modulos confirmados: ${joinSpanishList(
      MODULES.filter((module) => supportedModules.includes(module.key)).map((module) =>
        module.label.toLowerCase()
      )
    )}.`;
  }

  return null;
}
