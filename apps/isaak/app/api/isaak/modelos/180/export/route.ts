// C-B7+ — Modelo 180 export NO disponible aún.
//
// OCA/l10n-spain no incluye módulo l10n_es_aeat_mod180. Hace falta
// codificar el diseño de registro a mano desde el PDF AEAT, o esperar
// a que OCA lo añada. El cálculo sí funciona (compute180ForTenant) y
// el audit-log se puede generar; solo falta el fichero BOE oficial.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    {
      error: 'serializer_not_implemented',
      message:
        'El fichero BOE oficial del 180 aún no está implementado. El cálculo y el audit-log sí funcionan. Pendiente de añadir el diseño de registro AEAT desde su PDF oficial.',
      todo: 'aeat-formats/180/serializer.ts',
    },
    { status: 501 },
  );
}
