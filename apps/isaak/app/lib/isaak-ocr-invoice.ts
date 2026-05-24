// F4b OCR de facturas. Toma una imagen (URL pública o data URL base64) y
// devuelve un JSON estructurado con vendor, customer, invoiceNumber,
// dates, taxes, lines y total.
//
// Solo imágenes (PNG/JPG) en v1. PDFs requieren upload a OpenAI Files API
// o conversión previa a imagen — futuro.

import { callLLM, AIError } from '@verifactu/utils';
import type { AIInputImage } from '@verifactu/utils';
import {
  parseInvoiceJson,
  type InvoiceExtraction,
} from './isaak-ocr-invoice-parser';

const OCR_MODEL = 'gpt-4o';

const OCR_INSTRUCTIONS = `Eres un extractor OCR especializado en facturas españolas. Recibes la imagen de UNA factura (o ticket) y devuelves su contenido estructurado.

Devuelve EXCLUSIVAMENTE JSON válido sin markdown, sin backticks ni texto extra:
{
  "vendor": { "name": string|null, "taxId": string|null },
  "customer": { "name": string|null, "taxId": string|null },
  "invoiceNumber": string|null,
  "issueDate": string|null,
  "dueDate": string|null,
  "currency": "EUR"|"USD"|"GBP"|null,
  "subtotal": number|null,
  "taxes": [
    { "rate": number, "base": number, "amount": number }
  ],
  "total": number|null,
  "lines": [
    { "description": string, "quantity": number|null, "unitPrice": number|null, "amount": number|null }
  ],
  "notes": string|null,
  "confidence": number
}

Reglas:
- Fechas en formato ISO yyyy-mm-dd. Si la factura usa "dd/mm/yyyy", conviértelo.
- Importes como números (no strings). Si el texto dice "1.234,56" devuelve 1234.56.
- "taxId" es CIF, NIF o número de IVA del vendor / customer. Sin guiones extra.
- "taxes" array: una entrada por tipo de IVA (21%, 10%, 4%, 0%). Calcula base + amount cuando estén disponibles.
- "lines" array: una entrada por concepto facturado. Si la imagen es ilegible o no hay líneas explícitas, devuelve [] (no inventes).
- "confidence" 0..1. Reflexión honesta: ¿está la imagen nítida? ¿faltan campos críticos? Si la imagen NO es una factura, pon 0.
- Si NO puedes leer un campo, pon null. NUNCA inventes datos.
- Si la imagen claramente no es una factura, devuelve el schema con todos los campos a null y confidence=0.`;

export type ExtractInvoiceInput = {
  imageUrl: string;
  detail?: 'auto' | 'low' | 'high';
  hint?: string; // optional extra context, e.g. "this is a hosting receipt"
};

export async function extractInvoiceFromImage(
  input: ExtractInvoiceInput
): Promise<InvoiceExtraction> {
  const start = Date.now();
  const images: AIInputImage[] = [
    { url: input.imageUrl, detail: input.detail ?? 'auto' },
  ];

  try {
    const result = await callLLM({
      provider: 'openai',
      model: OCR_MODEL,
      instructions: OCR_INSTRUCTIONS,
      inputText: input.hint?.trim() || 'Extrae los datos de esta factura.',
      inputImages: images,
      temperature: 0,
      maxOutputTokens: 1500,
      responseFormat: 'json_object',
      feature: 'isaak_ocr_invoice',
      enableFallback: false,
    });
    const latencyMs = Date.now() - start;
    return parseInvoiceJson(result.text, result.model, latencyMs);
  } catch (error) {
    const latencyMs = Date.now() - start;
    const reason =
      error instanceof AIError ? `${error.kind}:${error.provider}` : 'unknown_error';
    console.error('[isaak-ocr-invoice] failed', { reason, latencyMs });
    return {
      vendor: { name: null, taxId: null },
      customer: { name: null, taxId: null },
      invoiceNumber: null,
      issueDate: null,
      dueDate: null,
      currency: null,
      subtotal: null,
      taxes: [],
      total: null,
      lines: [],
      notes: null,
      confidence: 0,
      modelUsed: OCR_MODEL,
      latencyMs,
      parseError: reason,
    };
  }
}
