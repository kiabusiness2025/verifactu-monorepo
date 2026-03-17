export type AccountingEntityType =
  | 'invoice'
  | 'quote'
  | 'expense'
  | 'customer'
  | 'supplier'
  | 'account'
  | 'tax_profile';

export type AccountingSourceKind =
  | 'verifactu_native'
  | 'excel_aeat'
  | 'holded'
  | 'external_api';

export type SyncDirection = 'pull' | 'push' | 'bidirectional';

export type CanonicalOwnershipMode =
  | 'native_master'
  | 'external_master'
  | 'shared_with_conflicts';

export type CanonicalFieldDescriptor = {
  key: string;
  label: string;
  description: string;
};

export type CanonicalEntityDescriptor = {
  entity: AccountingEntityType;
  label: string;
  description: string;
  fields: CanonicalFieldDescriptor[];
};

export const CANONICAL_ENTITY_DESCRIPTORS: Record<AccountingEntityType, CanonicalEntityDescriptor> = {
  invoice: {
    entity: 'invoice',
    label: 'Factura',
    description: 'Documento comercial emitido o recibido con impacto en ventas, cobros e impuestos.',
    fields: [
      { key: 'number', label: 'Número', description: 'Identificador visible del documento.' },
      { key: 'issueDate', label: 'Fecha emisión', description: 'Fecha de emisión del documento.' },
      { key: 'contact', label: 'Cliente o proveedor', description: 'Tercero relacionado con la factura.' },
      { key: 'lines', label: 'Líneas', description: 'Detalle económico y fiscal del documento.' },
      { key: 'totals', label: 'Totales', description: 'Base imponible, impuestos y total.' },
      { key: 'status', label: 'Estado', description: 'Borrador, emitida, pagada, vencida, etc.' },
    ],
  },
  quote: {
    entity: 'quote',
    label: 'Presupuesto',
    description: 'Oferta comercial previa a la factura, útil para flujos de preventa y conversión.',
    fields: [
      { key: 'number', label: 'Número', description: 'Identificador visible del presupuesto.' },
      { key: 'customer', label: 'Cliente', description: 'Cliente al que se dirige el presupuesto.' },
      { key: 'validUntil', label: 'Validez', description: 'Fecha límite de aceptación.' },
      { key: 'lines', label: 'Líneas', description: 'Detalle comercial del presupuesto.' },
      { key: 'totals', label: 'Totales', description: 'Importes del presupuesto.' },
    ],
  },
  expense: {
    entity: 'expense',
    label: 'Gasto',
    description: 'Movimiento de gasto o compra con metadatos fiscales y trazabilidad AEAT.',
    fields: [
      { key: 'date', label: 'Fecha', description: 'Fecha efectiva del gasto.' },
      { key: 'supplier', label: 'Proveedor', description: 'Proveedor asociado al gasto si existe.' },
      { key: 'category', label: 'Categoría', description: 'Clasificación operativa y fiscal.' },
      { key: 'tax', label: 'Impuesto', description: 'IVA, retención u otros campos fiscales asociados.' },
      { key: 'amount', label: 'Importe', description: 'Importe total del gasto.' },
      { key: 'canonicalStatus', label: 'Estado canónico', description: 'Draft, confirmado, sincronizado, etc.' },
    ],
  },
  customer: {
    entity: 'customer',
    label: 'Cliente',
    description: 'Tercero comercial para ventas, cobros y facturación.',
    fields: [
      { key: 'name', label: 'Nombre', description: 'Nombre comercial o razón social.' },
      { key: 'taxId', label: 'NIF/CIF', description: 'Identificación fiscal.' },
      { key: 'email', label: 'Email', description: 'Correo principal de contacto.' },
      { key: 'address', label: 'Dirección', description: 'Dirección fiscal o comercial.' },
    ],
  },
  supplier: {
    entity: 'supplier',
    label: 'Proveedor',
    description: 'Tercero comercial vinculado a compras, gastos y pagos.',
    fields: [
      { key: 'name', label: 'Nombre', description: 'Nombre comercial o razón social.' },
      { key: 'taxId', label: 'NIF/CIF', description: 'Identificación fiscal.' },
      { key: 'email', label: 'Email', description: 'Correo principal de contacto.' },
      { key: 'address', label: 'Dirección', description: 'Dirección fiscal o comercial.' },
    ],
  },
  account: {
    entity: 'account',
    label: 'Cuenta contable',
    description: 'Cuenta contable usada para clasificación y lectura del estado financiero.',
    fields: [
      { key: 'code', label: 'Código', description: 'Código contable visible.' },
      { key: 'name', label: 'Nombre', description: 'Nombre de la cuenta.' },
      { key: 'balance', label: 'Saldo', description: 'Saldo actual si la fuente lo aporta.' },
    ],
  },
  tax_profile: {
    entity: 'tax_profile',
    label: 'Perfil fiscal',
    description: 'Configuración fiscal del tenant: régimen, obligaciones y metadatos AEAT.',
    fields: [
      { key: 'taxId', label: 'NIF/CIF', description: 'Identificación fiscal del tenant.' },
      { key: 'regime', label: 'Régimen', description: 'Régimen fiscal aplicable.' },
      { key: 'obligations', label: 'Obligaciones', description: 'Modelos y ciclos aplicables.' },
    ],
  },
};
