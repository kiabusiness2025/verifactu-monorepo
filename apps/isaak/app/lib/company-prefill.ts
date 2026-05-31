// V2.D.3 — Wrapper local que inyecta el cliente Prisma de Isaak.
//
// La lógica vive en @verifactu/integrations/company-prefill para que
// apps/holded y apps/app puedan reusarla con su propio cliente Prisma.

import {
  prefillFromPublicSources as sharedPrefill,
  type CompanyPrefillInput,
  type CompanyPrefillResult,
} from '@verifactu/integrations';
import { prisma } from './prisma';

export type { CompanyPrefillInput, CompanyPrefillResult };

export function prefillFromPublicSources(
  input: CompanyPrefillInput,
): Promise<CompanyPrefillResult> {
  return sharedPrefill(prisma, input);
}
