export const COMPANY_ROLE_OPTIONS = [
  { value: 'owner', label: 'Propietario' },
  { value: 'representative', label: 'Representante' },
  { value: 'partner', label: 'Socio' },
  { value: 'employee', label: 'Empleado' },
  { value: 'proxy', label: 'Apoderado' },
  { value: 'other', label: 'Otro' },
] as const;

export const CNAE_SECTION_OPTIONS = [
  { value: 'A', label: 'Agricultura, ganaderia, silvicultura y pesca' },
  { value: 'B', label: 'Industrias extractivas' },
  { value: 'C', label: 'Industria manufacturera' },
  { value: 'D', label: 'Suministro de energia electrica, gas, vapor y aire acondicionado' },
  { value: 'E', label: 'Suministro de agua, saneamiento y gestion de residuos' },
  { value: 'F', label: 'Construccion' },
  {
    value: 'G',
    label: 'Comercio y reparacion de vehiculos de motor y motocicletas',
  },
  { value: 'H', label: 'Transporte y almacenamiento' },
  { value: 'I', label: 'Hosteleria' },
  { value: 'J', label: 'Informacion y comunicaciones' },
  { value: 'K', label: 'Actividades financieras y de seguros' },
  { value: 'L', label: 'Actividades inmobiliarias' },
  { value: 'M', label: 'Actividades profesionales, cientificas y tecnicas' },
  { value: 'N', label: 'Actividades administrativas y servicios auxiliares' },
  {
    value: 'O',
    label: 'Administracion publica, defensa y Seguridad Social obligatoria',
  },
  { value: 'P', label: 'Educacion' },
  { value: 'Q', label: 'Actividades sanitarias y de servicios sociales' },
  { value: 'R', label: 'Actividades artisticas, recreativas y de entretenimiento' },
  { value: 'S', label: 'Otros servicios' },
  {
    value: 'T',
    label: 'Actividades de los hogares como empleadores y para uso propio',
  },
  { value: 'U', label: 'Organizaciones y organismos extraterritoriales' },
] as const;

export function getCompanyRoleLabel(value?: string | null) {
  if (!value) return null;
  return COMPANY_ROLE_OPTIONS.find((option) => option.value === value)?.label || value;
}

export function getCnaeSectionLabel(input: { code?: string | null; fallback?: string | null }) {
  if (input.code) {
    return CNAE_SECTION_OPTIONS.find((option) => option.value === input.code)?.label || null;
  }

  return input.fallback ?? null;
}
