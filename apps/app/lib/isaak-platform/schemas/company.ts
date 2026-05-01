import { z } from 'zod';

export const CompanyContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  legalName: z.string().nullable(),
  nif: z.string().nullable(),
  fiscalAddress: z
    .object({
      street: z.string().nullable(),
      city: z.string().nullable(),
      postalCode: z.string().nullable(),
      province: z.string().nullable(),
      country: z.string().nullable(),
    })
    .nullable(),
  taxRegime: z.string().nullable(),
  verifactuEnabled: z.boolean(),
  createdAt: z.date(),
});

export type CompanyContextOutput = z.infer<typeof CompanyContextSchema>;
