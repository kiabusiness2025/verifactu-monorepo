// Minimal type stub for `pdf-parse` (no @types package exists upstream).
// Used by app/lib/aeat-corpus-extractors.ts to extract text from AEAT manual PDFs.
// Only the surface we actually call is typed; the rest stays `any`.
declare module 'pdf-parse' {
  type PdfParseOutput = {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
  };

  type PdfParseFn = (
    data: Buffer | Uint8Array,
    options?: Record<string, unknown>
  ) => Promise<PdfParseOutput>;

  const pdfParse: PdfParseFn;
  export default pdfParse;
}
